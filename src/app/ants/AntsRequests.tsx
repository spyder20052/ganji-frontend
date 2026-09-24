'use client';
import { ChevronDown, MessageSquareText, PhoneCall, RefreshCw, Smartphone, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime, relative } from '@/lib/format';
import type { BloodRequestView } from '@/lib/types';
import { BLOOD_STATUS, BLOOD_URGENCY, CHANNEL_LABEL, DONOR_STATUS, PRODUCT_LABEL, km, whenFr } from '../pro/_lib/labels';
import { Pill } from '../pro/_lib/ui';

const OPEN = new Set(['OUVERTE', 'DONNEURS_ALERTES', 'DONNEUR_TROUVE']);
const CAN_ALERT = new Set(['OUVERTE', 'DONNEURS_ALERTES']);
const CHANNEL_ICON: Record<string, LucideIcon> = { APP: Smartphone, SMS: MessageSquareText, VOICE: PhoneCall };

/** Demandes de sang du pays : ouvertes d'abord, donneurs visibles au dépliage. */
export function AntsRequests({ initial }: { initial: BloodRequestView[] }) {
  const [items, setItems] = useState(initial);
  const [showClosed, setShowClosed] = useState(false);
  const open = items.filter((r) => OPEN.has(r.status));
  const closed = items.filter((r) => !OPEN.has(r.status));
  const urgencyRank = (u: string) => (u === 'VITALE' ? 0 : u === 'URGENTE' ? 1 : 2);
  const sortedOpen = [...open].sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency) || +new Date(a.neededBy) - +new Date(b.neededBy));

  const replace = (r: BloodRequestView) => setItems((xs) => xs.map((x) => (x.id === r.id ? { ...x, ...r } : x)));

  return (
    <div>
      {sortedOpen.length === 0 ? (
        <p className="mt-3 text-[var(--fg-muted)]">Aucune demande en cours.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sortedOpen.map((r) => (
            <RequestRow key={r.id} r={r} onUpdate={replace} />
          ))}
        </ul>
      )}
      {closed.length > 0 && (
        <div className="mt-4">
          <button type="button" className="btn btn-ghost !min-h-11 text-base" aria-expanded={showClosed} onClick={() => setShowClosed((s) => !s)}>
            <ChevronDown size={18} aria-hidden className={showClosed ? 'rotate-180' : ''} /> Demandes clôturées ({closed.length})
          </button>
          {showClosed && (
            <ul className="mt-3 space-y-3">
              {closed.map((r) => (
                <RequestRow key={r.id} r={r} onUpdate={replace} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RequestRow({ r, onUpdate }: { r: BloodRequestView; onUpdate: (r: BloodRequestView) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<BloodRequestView | null>(null);
  const [loading, setLoading] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelId = `donneurs-${r.id}`;
  const st = BLOOD_STATUS[r.status] ?? { label: r.status, tone: 'muted' as const };
  const urg = BLOOD_URGENCY[r.urgency];

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await api<BloodRequestView>(`/blood/requests/${r.id}`);
      setDetail(d);
      onUpdate(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) await load();
  }

  async function alertDonors() {
    setAlerting(true);
    setError(null);
    setNote(null);
    try {
      const res = await api<{ alerted: number }>(`/blood/requests/${r.id}/alert-donors`, { method: 'POST' });
      setNote(res.alerted ? `${res.alerted} donneur${res.alerted > 1 ? 's' : ''} de plus alerté${res.alerted > 1 ? 's' : ''}.` : 'Aucun autre donneur compatible disponible à moins de 40 km.');
      setExpanded(true);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Relance impossible.');
    } finally {
      setAlerting(false);
    }
  }

  const donors = detail?.donors ?? [];

  return (
    <li className={`rounded-2xl border p-4 ${r.urgency === 'VITALE' && OPEN.has(r.status) ? 'border-[var(--color-danger-600)]/50' : 'border-[var(--border)]'}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <span className="grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-[var(--color-danger-50)] text-lg font-bold text-[var(--color-danger-800)]">{r.bloodGroup}</span>
        <div className="min-w-0 flex-1 basis-64">
          <p className="font-bold">
            {r.quantity} × {PRODUCT_LABEL[r.product] ?? r.productLabel} · {r.facility}
          </p>
          <p className="text-sm text-[var(--fg-muted)]">
            {r.patient} · {r.requester} · {relative(r.createdAt)} · avant le {fmtDateTime(r.neededBy)}
          </p>
          <p className="num mt-1 text-sm">
            <span className="font-bold">{r.counts.alerted}</span> alertés · <span className="font-bold text-[var(--color-brand-700)]">{r.counts.accepted} oui</span> · {r.counts.declined} non · {r.counts.waiting} en attente
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {urg && <Pill tone={urg.tone}>{urg.label}</Pill>}
          <Pill tone={st.tone}>{st.label}</Pill>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost !min-h-11 text-base" aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
          <ChevronDown size={18} aria-hidden className={expanded ? 'rotate-180' : ''} /> Donneurs
        </button>
        {CAN_ALERT.has(r.status) && (
          <button type="button" className="btn btn-soft !min-h-11 text-base" onClick={alertDonors} disabled={alerting}>
            <RefreshCw size={18} aria-hidden className={alerting ? 'animate-spin' : ''} /> {alerting ? 'Relance…' : 'Relancer les donneurs'}
          </button>
        )}
      </div>
      {(note || error) && (
        <p role={error ? 'alert' : 'status'} className={`mt-2 text-sm font-bold ${error ? 'text-[var(--color-ocre-700)]' : 'text-[var(--color-brand-700)]'}`}>
          {error ?? note}
        </p>
      )}
      {expanded && (
        <div id={panelId} className="mt-3" aria-busy={loading}>
          {loading && !detail ? (
            <p className="text-sm text-[var(--fg-muted)]">Chargement des donneurs…</p>
          ) : donors.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">Aucun donneur alerté pour cette demande.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-[0.95rem]">
                <caption className="sr-only">Donneurs alertés pour cette demande</caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--fg-muted)]">
                    <th scope="col" className="py-1.5 pr-2 font-bold">Prénom</th>
                    <th scope="col" className="py-1.5 pr-2 font-bold">Groupe</th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-bold">Distance</th>
                    <th scope="col" className="py-1.5 pr-2 font-bold">Canal</th>
                    <th scope="col" className="py-1.5 font-bold">Réponse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {donors.map((d) => {
                    const Icon = CHANNEL_ICON[d.channel] ?? Smartphone;
                    const ds = DONOR_STATUS[d.status] ?? { label: d.status, tone: 'muted' as const };
                    return (
                      <tr key={d.id}>
                        <td className="py-1.5 pr-2">
                          <span className="font-bold">{d.firstName}</span> <span className="text-sm text-[var(--fg-muted)]">{d.city}</span>
                        </td>
                        <td className="num py-1.5 pr-2 font-bold">{d.bloodGroup}</td>
                        <td className="num py-1.5 pr-2 text-right">{km(d.distanceKm)}</td>
                        <td className="py-1.5 pr-2">
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <Icon size={16} aria-hidden /> {CHANNEL_LABEL[d.channel] ?? d.channel}
                          </span>
                        </td>
                        <td className="py-1.5">
                          <Pill tone={ds.tone}>{ds.label}</Pill>
                          {d.status === 'ACCEPTEE' && d.appointment && <span className="ml-2 text-sm text-[var(--color-brand-700)]">RDV {whenFr(d.appointment)}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
