import Link from 'next/link';
import { ArrowRight, Droplet, MessagesSquare } from 'lucide-react';
import { tryServerApi } from '@/lib/server-api';
import { fmtDate, fmtTime, relative } from '@/lib/format';
import type { BloodRequestView } from '@/lib/types';
import { ACCESS_VIA, BLOOD_STATUS, BLOOD_URGENCY } from './_lib/labels';
import type { MyPatient, TeleItem } from './_lib/types';
import { Pill } from './_lib/ui';
import { OpenRecord } from './OpenRecord';

function accessText(p: MyPatient) {
  if (p.via === 'CARE_TEAM') return ACCESS_VIA.CARE_TEAM.label;
  if (!p.expiresAt) return ACCESS_VIA[p.via].label;
  const sameDay = new Date(p.expiresAt).getTime() - Date.now() < 20 * 3600_000;
  const until = sameDay ? fmtTime(p.expiresAt) : `${fmtDate(p.expiresAt, { day: 'numeric', month: 'short' })} ${fmtTime(p.expiresAt)}`;
  return p.via === 'BREAK_GLASS' ? `Bris de glace · jusqu’à ${until}` : `Consentement jusqu’à ${until}`;
}

export default async function ProHome() {
  const [patients, tele, blood] = await Promise.all([
    tryServerApi<MyPatient[]>('/patients'),
    tryServerApi<TeleItem[]>('/tele-expertise'),
    tryServerApi<BloodRequestView[]>('/blood/requests'),
  ]);
  const toAnswer = (tele ?? []).filter((t) => !t.mine && t.status === 'EN_ATTENTE');
  const waitingMine = (tele ?? []).filter((t) => t.mine && t.status === 'EN_ATTENTE');
  const answeredMine = (tele ?? []).filter((t) => t.mine && t.status === 'REPONDUE');
  const sorted = [...(patients ?? [])].sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr'));

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Espace soignant</h1>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <OpenRecord />

        <section aria-labelledby="h-patients" className="card p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="h-patients" className="text-xl font-bold">Mes patients</h2>
            <span className="num text-sm text-[var(--fg-muted)]">{sorted.length} dossier{sorted.length > 1 ? 's' : ''} accessible{sorted.length > 1 ? 's' : ''}</span>
          </div>
          {patients === null ? (
            <p className="mt-3 text-[var(--fg-muted)]">Liste indisponible pour le moment.</p>
          ) : sorted.length === 0 ? (
            <p className="mt-3 text-[var(--fg-muted)]">Aucun dossier ouvert. Scannez le QR d’un patient pour commencer.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {sorted.map((p) => (
                <li key={p.id}>
                  <Link href={`/pro/patients/${p.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2 hover:bg-[var(--bg)]">
                    <span className="grid h-10 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-danger-50)] text-sm font-bold text-[var(--color-danger-800)]" title="Groupe sanguin">
                      {p.bloodGroup ?? '?'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="block text-sm text-[var(--fg-muted)]">
                        {p.age} ans · {p.sex === 'F' ? 'femme' : 'homme'}
                        {p.commune ? ` · ${p.commune}` : ''}
                      </span>
                    </span>
                    <Pill tone={ACCESS_VIA[p.via]?.tone ?? 'muted'}>{accessText(p)}</Pill>
                    <ArrowRight size={18} aria-hidden className="text-[var(--fg-muted)]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="h-tele" className="card p-5">
          <div className="flex items-center gap-3">
            <span className="chip-round shrink-0 text-[var(--color-brand-900)]">
              <MessagesSquare size={22} aria-hidden />
            </span>
            <h2 id="h-tele" className="flex-1 text-xl font-bold">Télé-expertise</h2>
            <Link href="/pro/tele-expertise" className="btn btn-ghost !min-h-11 text-base">
              Ouvrir
            </Link>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-[var(--color-ocre-100)] p-3">
              <dt className="text-sm font-bold text-[var(--color-ocre-700)]">À répondre</dt>
              <dd className="num text-3xl font-bold text-[var(--color-ocre-700)]">{toAnswer.length}</dd>
            </div>
            <div className="rounded-2xl bg-[var(--bg)] p-3">
              <dt className="text-sm font-bold text-[var(--fg-muted)]">Mes demandes en attente</dt>
              <dd className="num text-3xl font-bold">{waitingMine.length}</dd>
            </div>
            <div className="rounded-2xl bg-[var(--color-brand-100)] p-3">
              <dt className="text-sm font-bold text-[var(--color-brand-900)]">Avis reçus</dt>
              <dd className="num text-3xl font-bold text-[var(--color-brand-900)]">{answeredMine.length}</dd>
            </div>
          </dl>
          {toAnswer.some((t) => t.urgency === 'URGENTE') && (
            <p className="mt-3 text-sm font-bold text-[var(--color-ocre-700)]">
              {toAnswer.filter((t) => t.urgency === 'URGENTE').length} demande(s) urgente(s) attendent votre avis.
            </p>
          )}
        </section>

        <section aria-labelledby="h-blood" className="card p-5">
          <div className="flex items-center gap-3">
            <span className="chip-round shrink-0 text-[var(--color-danger-600)]">
              <Droplet size={22} aria-hidden />
            </span>
            <h2 id="h-blood" className="flex-1 text-xl font-bold">Mes demandes de sang</h2>
          </div>
          {!blood?.length ? (
            <p className="mt-3 text-[var(--fg-muted)]">Aucune demande. Elles se créent depuis la fiche d’un patient.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {blood.slice(0, 8).map((r) => (
                <li key={r.id}>
                  <Link href={`/pro/sang/${r.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2 hover:bg-[var(--bg)]">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">
                        {r.quantity} × {r.productLabel} {r.bloodGroup} · {r.patient}
                      </span>
                      <span className="block text-sm text-[var(--fg-muted)]">
                        {relative(r.createdAt)} · <span className="num">{r.counts.accepted}</span> oui sur <span className="num">{r.counts.alerted}</span> alerté{r.counts.alerted > 1 ? 's' : ''}
                      </span>
                    </span>
                    {r.urgency === 'VITALE' && r.status !== 'SERVIE' && <Pill tone="danger">{BLOOD_URGENCY.VITALE.label}</Pill>}
                    <Pill tone={BLOOD_STATUS[r.status]?.tone}>{BLOOD_STATUS[r.status]?.label ?? r.status}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
