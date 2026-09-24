'use client';
import { Camera, Eye, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { blobToB64, compress } from '@/lib/image';
import { sendOrQueue } from '@/lib/offline-queue';

export function DocumentUpload({ patientId }: { patientId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('RESULTAT');
  const [ready, setReady] = useState<{ blob: Blob; mime: 'image/webp' | 'image/jpeg'; preview: string; originalKb: number } | null>(null);
  const [busy, setBusy] = useState<'compress' | 'send' | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => () => { if (ready) URL.revokeObjectURL(ready.preview); }, [ready]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    setBusy('compress');
    try {
      const out = await compress(file);
      setReady({ ...out, preview: URL.createObjectURL(out.blob), originalKb: Math.round(file.size / 1024) });
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 60));
    } catch (e) {
      setMsg({ tone: 'err', text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!ready || !title.trim()) return;
    setBusy('send');
    setMsg(null);
    try {
      const dataB64 = await blobToB64(ready.blob);
      const r = await sendOrQueue({ path: `/patients/${patientId}/documents`, method: 'POST', body: { title: title.trim().slice(0, 80), kind, mime: ready.mime, dataB64 }, label: `Document « ${title.trim()} »` });
      setMsg({ tone: 'ok', text: r.queued ? 'Pas de réseau : le document est gardé sur le téléphone et partira au retour du réseau.' : 'Document ajouté à votre carnet.' });
      setReady(null);
      setTitle('');
      if (inputRef.current) inputRef.current.value = '';
      if (!r.queued) router.refresh();
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof ApiError ? e.message : 'Envoi impossible. Réessayez.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl bg-[var(--bg)] p-4">
      <h3 className="text-lg font-bold">Ajouter un document papier</h3>
      <label className="btn btn-soft w-full cursor-pointer sm:w-auto">
        {busy === 'compress' ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Camera size={20} aria-hidden />}
        {ready ? 'Reprendre la photo' : 'Prendre en photo'}
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
      </label>
      {ready && (
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ready.preview} alt="Aperçu du document à envoyer" className="h-40 w-40 rounded-2xl border border-[var(--border)] object-cover" />
          <div className="space-y-3">
            <p className="text-base text-[var(--fg-muted)]">
              Photo allégée : <span className="num font-bold">{ready.originalKb} Ko → {Math.round(ready.blob.size / 1024)} Ko</span>, pour passer même avec peu de réseau.
            </p>
            <label className="block">
              <span className="mb-1 block font-bold">Nom du document</span>
              <input className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : NFS du 12 octobre" required />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold">Type</span>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="RESULTAT">Résultat d’analyse</option>
                <option value="ORDONNANCE">Ordonnance</option>
                <option value="COMPTE_RENDU">Compte rendu</option>
                <option value="IMAGERIE">Imagerie (radio, échographie)</option>
                <option value="AUTRE">Autre</option>
              </select>
            </label>
            <button type="button" className="btn btn-primary w-full" disabled={busy !== null || !title.trim()} onClick={() => void send()}>
              {busy === 'send' ? 'Envoi…' : 'Ajouter à mon carnet'}
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p role={msg.tone === 'err' ? 'alert' : 'status'} className={`rounded-2xl p-3 text-base font-bold ${msg.tone === 'err' ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

/** Ouvre un document : image dans une fenêtre, PDF dans un nouvel onglet. */
export function DocumentOpen({ patientId, docId, title }: { patientId: string; docId: string; title: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (src) dialogRef.current?.showModal();
  }, [src]);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const d = await api<{ mime: string; dataB64: string }>(`/patients/${patientId}/documents/${docId}`);
      if (d.mime === 'application/pdf') {
        const bytes = Uint8Array.from(atob(d.dataB64), (c) => c.charCodeAt(0));
        window.open(URL.createObjectURL(new Blob([bytes], { type: d.mime })), '_blank', 'noopener');
      } else {
        setSrc(`data:${d.mime};base64,${d.dataB64}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ouverture impossible. Vérifiez le réseau.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost !min-h-12" onClick={() => void open()} disabled={busy} aria-label={`Voir le document ${title}`}>
        {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Eye size={18} aria-hidden />} Voir
      </button>
      {error && <p role="alert" className="w-full text-base text-[var(--color-ocre-700)]">{error}</p>}
      <dialog ref={dialogRef} onClose={() => setSrc(null)} aria-label={title} className="m-auto max-h-[90dvh] max-w-3xl rounded-3xl bg-[var(--card)] p-0 text-[var(--fg)] backdrop:bg-black/60">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-3">
          <p className="font-bold">{title}</p>
          <button type="button" className="chip-round" aria-label="Fermer" onClick={() => dialogRef.current?.close()}>
            <X size={20} aria-hidden />
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt={title} className="block max-h-[75dvh] w-auto max-w-full object-contain" />}
      </dialog>
    </>
  );
}
