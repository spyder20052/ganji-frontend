'use client';
import { Camera, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { blobToB64, compress } from '@/lib/image';
import { ENCOUNTER_TYPES, OBSERVATION_CODES, SPECIALTY_LABEL, TELE_SPECIALTIES } from '../../_lib/labels';
import { ErrorNote, OkNote } from '../../_lib/ui';

/** Petit état commun aux formulaires : envoi, erreur, confirmation, rafraîchissement du dossier. */
function useSubmit() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<React.ReactNode>(null);
  async function run(fn: () => Promise<React.ReactNode>) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      setOk(await fn());
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Enregistrement impossible. Réessayez.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, ok, run };
}

export function EncounterForm({ patientId }: { patientId: string }) {
  const uid = useId();
  const [type, setType] = useState('CONSULTATION');
  const [summary, setSummary] = useState('');
  const { busy, error, ok, run } = useSubmit();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const done = await run(async () => {
          await api(`/patients/${patientId}/encounters`, { method: 'POST', json: { type, summary: summary.trim() } });
          return 'Compte rendu ajouté à la chronologie (chiffré).';
        });
        if (done) setSummary('');
      }}
    >
      <label htmlFor={`${uid}-t`} className="label block">
        Type
      </label>
      <select id={`${uid}-t`} className="input max-w-sm" value={type} onChange={(e) => setType(e.target.value)}>
        {ENCOUNTER_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${uid}-s`} className="label block">
        Compte rendu
      </label>
      <textarea
        id={`${uid}-s`}
        className="input min-h-32 py-2"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        minLength={3}
        maxLength={2000}
        required
        placeholder="Motif, examen, conclusion, conduite à tenir…"
      />
      <ErrorNote>{error}</ErrorNote>
      <OkNote>{ok}</OkNote>
      <button type="submit" className="btn btn-primary" disabled={busy || summary.trim().length < 3}>
        {busy ? 'Enregistrement…' : 'Ajouter au carnet'}
      </button>
    </form>
  );
}

export function ObservationForm({ patientId }: { patientId: string }) {
  const uid = useId();
  const [code, setCode] = useState('PLT');
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const { busy, error, ok, run } = useSubmit();
  const meta = OBSERVATION_CODES.find((c) => c.value === code)!;
  const num = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(num);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        const done = await run(async () => {
          await api(`/patients/${patientId}/observations`, { method: 'POST', json: { code, value: num, ...(date ? { date: new Date(date).toISOString() } : {}) } });
          return `${meta.label} : ${num} ${meta.unit} ajouté aux courbes.`;
        });
        if (done) setValue('');
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label htmlFor={`${uid}-c`} className="text-sm font-bold">
          Examen
          <select id={`${uid}-c`} className="input mt-1 font-normal" value={code} onChange={(e) => setCode(e.target.value)}>
            {OBSERVATION_CODES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} ({c.unit})
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${uid}-v`} className="text-sm font-bold">
          Valeur ({meta.unit})
          <input id={`${uid}-v`} className="input num mt-1 font-normal" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required placeholder="Ex. 42" />
        </label>
        <label htmlFor={`${uid}-d`} className="text-sm font-bold">
          Date du prélèvement <span className="font-normal text-[var(--fg-muted)]">(aujourd’hui par défaut)</span>
          <input id={`${uid}-d`} type="date" className="input mt-1 font-normal" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        </label>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <OkNote>{ok}</OkNote>
      <button type="submit" className="btn btn-primary" disabled={busy || !valid}>
        {busy ? 'Enregistrement…' : 'Ajouter le résultat'}
      </button>
    </form>
  );
}

const MAX_PHOTOS = 3;

export function TeleForm({ patientId, firstName }: { patientId: string; firstName: string }) {
  const uid = useId();
  const [specialty, setSpecialty] = useState<string>('HEMATOLOGIE');
  const [urgency, setUrgency] = useState('NORMALE');
  const [question, setQuestion] = useState('');
  const [photos, setPhotos] = useState<{ b64: string; preview: string; kb: number }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const { busy, error, ok, run } = useSubmit();
  const len = question.trim().length;

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), [photos]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError(null);
    setCompressing(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      const added: typeof photos = [];
      for (const file of Array.from(files).slice(0, room)) {
        const { blob } = await compress(file);
        added.push({ b64: await blobToB64(blob), preview: URL.createObjectURL(blob), kb: Math.round(blob.size / 1024) });
      }
      setPhotos((cur) => [...cur, ...added]);
      if (files.length > room) setPhotoError(`${MAX_PHOTOS} photos au plus par demande.`);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Photo illisible.');
    } finally {
      setCompressing(false);
    }
  }
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (len < 20) return;
        const done = await run(async () => {
          const attachments = photos.map((p) => p.b64);
          const r = await api<{ id: string; specialistsNotified: number }>('/tele-expertise', { method: 'POST', json: { patientId, specialty, urgency, question: question.trim(), attachments } });
          return (
            <>
              Demande envoyée à {r.specialistsNotified} spécialiste{r.specialistsNotified > 1 ? 's' : ''} en {SPECIALTY_LABEL[specialty]?.toLowerCase()}. Ils lisent le carnet de {firstName} pendant 7 jours.{' '}
              <Link href={`/pro/tele-expertise/${r.id}`} className="underline">
                Suivre la demande
              </Link>
            </>
          );
        });
        if (done) {
          setQuestion('');
          setPhotos([]);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${uid}-s`} className="text-sm font-bold">
          Spécialité
          <select id={`${uid}-s`} className="input mt-1 font-normal" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {TELE_SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {SPECIALTY_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm">
          <legend className="font-bold">Délai de réponse</legend>
          <div className="mt-1 flex gap-2">
            {[
              ['NORMALE', 'Normal (48 h)'],
              ['URGENTE', 'Urgent (dans la journée)'],
            ].map(([v, l]) => (
              <label key={v} className={`flex min-h-12 flex-1 cursor-pointer items-center gap-2 rounded-2xl border px-3 ${urgency === v ? 'border-[var(--fg)] bg-[var(--bg)] font-bold' : 'border-[var(--border)]'}`}>
                <input type="radio" name={`${uid}-u`} value={v} checked={urgency === v} onChange={() => setUrgency(v)} className="h-4 w-4" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <label htmlFor={`${uid}-q`} className="label block">
        Question
      </label>
      <textarea
        id={`${uid}-q`}
        className="input min-h-32 py-2"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={3000}
        required
        aria-describedby={`${uid}-n`}
        placeholder="Contexte, examens disponibles, ce que vous attendez du spécialiste…"
      />
      <p id={`${uid}-n`} className="num text-sm text-[var(--fg-muted)]">
        {len < 20 ? `${20 - len} caractère(s) minimum restant(s)` : `${len} / 3000`} · le spécialiste voit le carnet, inutile de tout recopier.
      </p>
      <fieldset className="space-y-2">
        <legend className="label">Photos (lésion, résultat papier, radio) · facultatif</legend>
        {photos.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <li key={p.preview} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
                <img src={p.preview} alt={`Photo ${i + 1}, ${p.kb} Ko`} className="h-24 w-24 rounded-2xl border border-[var(--border)] object-cover" />
                <button
                  type="button"
                  className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)]"
                  aria-label={`Retirer la photo ${i + 1}`}
                  onClick={() => setPhotos((cur) => cur.filter((x) => x !== p))}
                >
                  <X size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_PHOTOS && (
          <label className="btn btn-ghost cursor-pointer">
            <Camera size={20} aria-hidden /> {compressing ? 'Compression…' : photos.length ? 'Ajouter une photo' : 'Joindre des photos'}
            <input type="file" accept="image/*" capture="environment" multiple className="sr-only" disabled={compressing} onChange={(e) => { void addPhotos(e.target.files); e.target.value = ''; }} />
          </label>
        )}
        <p className="text-sm text-[var(--fg-muted)]">Compressées sur l’appareil (300 Ko au plus chacune) : l’envoi passe en 2G.</p>
        <ErrorNote>{photoError}</ErrorNote>
      </fieldset>
      <ErrorNote>{error}</ErrorNote>
      <OkNote>{ok}</OkNote>
      <button type="submit" className="btn btn-primary" disabled={busy || compressing || len < 20}>
        {busy ? 'Envoi…' : 'Envoyer la demande d’avis'}
      </button>
    </form>
  );
}
