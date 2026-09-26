'use client';
import { Check, ChevronDown, HandHeart, MessageSquareText, Minus, Phone, PhoneCall, Plus, RefreshCw, Smartphone, Warehouse, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { INTL, type Locale, frenchStyle } from '@/i18n/translate';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime, relative } from '@/lib/format';
import { fmtPhone } from '@/lib/format';
import { BLOOD_STATUS, BLOOD_URGENCY, CHANNEL_LABEL, DONOR_STATUS, PRODUCT_LABEL, km, whenFr } from '../pro/_lib/labels';
import { Pill } from '../pro/_lib/ui';
import { ServedConfirm } from '../pro/sang/[id]/ServedConfirm';
import type { AlertResult, LiveRequest } from '../pro/sang/[id]/types';
import { unitsOf, type StockSite } from './stock';

const OPEN = new Set(['OUVERTE', 'DONNEURS_ALERTES', 'DONNEUR_TROUVE', 'POCHES_RESERVEES']);
/** Demande encore à couvrir : relancer des donneurs ou réserver des poches reste possible. */
const NEEDS_BLOOD = new Set(['OUVERTE', 'DONNEURS_ALERTES', 'DONNEUR_TROUVE']);
const CHANNEL_ICON: Record<string, LucideIcon> = { APP: Smartphone, SMS: MessageSquareText, VOICE: PhoneCall };

/** Distance avec le séparateur décimal de la langue (rendu de km() inchangé en français). */
const kmIn = (n: number, locale: Locale) => (frenchStyle(locale) ? km(n) : `${n.toLocaleString(INTL[locale], { maximumFractionDigits: n < 10 ? 1 : 0 })} km`);

/** Demandes de sang du pays : ouvertes d'abord, donneurs visibles au dépliage. */
export function AntsRequests({ initial, own }: { initial: LiveRequest[]; own: StockSite | null }) {
  const t = useT();
  const [items, setItems] = useState(initial);
  const [stock, setStock] = useState(own);
  const [showClosed, setShowClosed] = useState(false);
  const open = items.filter((r) => OPEN.has(r.status));
  const closed = items.filter((r) => !OPEN.has(r.status));
  const urgencyRank = (u: string) => (u === 'VITALE' ? 0 : u === 'URGENTE' ? 1 : 2);
  const sortedOpen = [...open].sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency) || +new Date(a.neededBy) - +new Date(b.neededBy));

  const replace = (r: LiveRequest) => setItems((xs) => xs.map((x) => (x.id === r.id ? { ...x, ...r } : x)));
  /** Poches réservées : retirées du stock affiché du site, sans recharger la page. */
  const drawn = (product: string, draw: { bloodGroup: string; units: number }[]) =>
    setStock((s) =>
      s ? { ...s, stock: s.stock.map((x) => (x.product === product ? { ...x, units: x.units - (draw.find((d) => d.bloodGroup === x.bloodGroup)?.units ?? 0) } : x)) } : s,
    );

  return (
    <div>
      {sortedOpen.length === 0 ? (
        <p className="mt-3 text-[var(--fg-muted)]">{t('Aucune demande en cours.')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sortedOpen.map((r) => (
            <RequestRow key={r.id} r={r} onUpdate={replace} stock={stock} onDrawn={drawn} />
          ))}
        </ul>
      )}
      {closed.length > 0 && (
        <div className="mt-4">
          <button type="button" className="btn btn-ghost !min-h-11 text-base" aria-expanded={showClosed} onClick={() => setShowClosed((s) => !s)}>
            <ChevronDown size={18} aria-hidden className={showClosed ? 'rotate-180' : ''} /> {t('Demandes clôturées ({n})', { n: closed.length })}
          </button>
          {showClosed && (
            <ul className="mt-3 space-y-3">
              {closed.map((r) => (
                <RequestRow key={r.id} r={r} onUpdate={replace} stock={stock} onDrawn={drawn} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RequestRow({
  r, onUpdate, stock, onDrawn,
}: {
  r: LiveRequest; onUpdate: (r: LiveRequest) => void; stock: StockSite | null; onDrawn: (product: string, draw: { bloodGroup: string; units: number }[]) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<LiveRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [serving, setServing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelId = `donneurs-${r.id}`;
  const st = BLOOD_STATUS[r.status] ?? { label: r.status, tone: 'muted' as const };
  const urg = BLOOD_URGENCY[r.urgency];

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await api<LiveRequest>(`/blood/requests/${r.id}`);
      setDetail(d);
      onUpdate(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Chargement impossible.'));
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
      const res = await api<AlertResult>(`/blood/requests/${r.id}/alert-donors`, { method: 'POST' });
      setNote(
        res.alerted
          ? `${res.alerted > 1 ? t('{n} donneurs de plus alertés.', { n: res.alerted }) : t('{n} donneur de plus alerté.', { n: res.alerted })}${res.widened && res.radiusKm ? ` ${t('Rayon élargi à {km} km.', { km: res.radiusKm })}` : ''}`
          : t('Aucun autre donneur compatible disponible, même à 150 km.'),
      );
      setExpanded(true);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Relance impossible.'));
    } finally {
      setAlerting(false);
    }
  }

  const donors = detail?.donors ?? [];
  const view = detail ?? r;
  const cov = view.coverage;
  const needs = NEEDS_BLOOD.has(view.status) && !cov?.complete;
  const missing = cov?.missing ?? r.quantity;
  // Poches compatibles dans le stock du site connecté, pour ce produit.
  const compatible = view.compatibleGroups ?? [view.bloodGroup];
  const available = stock ? compatible.reduce((n, g) => n + Math.max(0, unitsOf(stock, view.product, g)), 0) : 0;
  const maxReserve = Math.min(missing, available);

  // Lien d'une notification (/ants#demande-<id>) : la demande s'ouvre et vient à l'écran.
  useEffect(() => {
    if (window.location.hash !== `#demande-${r.id}`) return;
    setExpanded(true);
    void load();
    document.getElementById(`demande-${r.id}`)?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.id]);

  return (
    <li id={`demande-${r.id}`} className={`scroll-mt-24 rounded-2xl border p-4 ${r.urgency === 'VITALE' && OPEN.has(r.status) ? 'border-[var(--color-danger-600)]/50' : 'border-[var(--border)]'}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <span className="grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-[var(--color-danger-50)] text-lg font-bold text-[var(--color-danger-800)]">{r.bloodGroup}</span>
        <div className="min-w-0 flex-1 basis-64">
          <p className="font-bold">
            {r.quantity} × {t(PRODUCT_LABEL[r.product] ?? r.productLabel)} · {r.facility}
          </p>
          <p className="text-sm text-[var(--fg-muted)]">
            {r.patient} · {r.requester} · {relative(r.createdAt, locale)} · {t('avant le {date}', { date: fmtDateTime(r.neededBy, locale) })}
          </p>
          <p className="num mt-1 text-sm">
            <span className="font-bold">{view.counts.alerted}</span> {t('alertés')} · <span className="font-bold text-[var(--color-brand-700)]">{t('{n} oui', { n: view.counts.accepted })}</span> · {t('{n} non', { n: view.counts.declined })} · {t('{n} en attente', { n: view.counts.waiting })}
          </p>
          {cov && (
            <p className="num mt-1 text-sm font-bold">
              {t('{covered}/{n} poches couvertes', { covered: cov.covered, n: view.quantity })}
              {view.reserved ? ` · ${t('{n} réservée(s) par {site}', { n: view.reserved.units, site: view.reserved.site ?? '—' })}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {urg && <Pill tone={urg.tone}>{t(urg.label)}</Pill>}
          <Pill tone={st.tone}>{t(st.label)}</Pill>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost !min-h-11 text-base" aria-expanded={expanded} aria-controls={panelId} onClick={toggle}>
          <ChevronDown size={18} aria-hidden className={expanded ? 'rotate-180' : ''} /> {t('Donneurs')}
        </button>
        {needs && (
          <button type="button" className="btn btn-soft !min-h-11 text-base" onClick={alertDonors} disabled={alerting}>
            <RefreshCw size={18} aria-hidden className={alerting ? 'animate-spin' : ''} /> {alerting ? t('Relance…') : t('Relancer les donneurs')}
          </button>
        )}
      </div>
      {needs && stock && (
        <Reserve
          requestId={r.id}
          max={maxReserve}
          available={available}
          missing={missing}
          onDone={(res) => {
            setDetail(res);
            onUpdate(res);
            onDrawn(res.product, res.reservation.draw);
            setNote(t(res.reservation.units > 1 ? '{n} poches réservées. Le médecin est prévenu.' : '{n} poche réservée. Le médecin est prévenu.', { n: res.reservation.units }));
          }}
        />
      )}
      {(note || error) && (
        <p role={error ? 'alert' : 'status'} className={`mt-2 text-sm font-bold ${error ? 'text-[var(--color-ocre-700)]' : 'text-[var(--color-brand-700)]'}`}>
          {error ?? note}
        </p>
      )}
      {expanded && (
        <div id={panelId} className="mt-3" aria-busy={loading}>
          {loading && !detail ? (
            <p className="text-sm text-[var(--fg-muted)]">{t('Chargement des donneurs…')}</p>
          ) : donors.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">{t('Aucun donneur alerté pour cette demande.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-[0.95rem]">
                <caption className="sr-only">{t('Donneurs alertés pour cette demande')}</caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--fg-muted)]">
                    <th scope="col" className="py-1.5 pr-2 font-bold">{t('Prénom')}</th>
                    <th scope="col" className="py-1.5 pr-2 font-bold">{t('Groupe')}</th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-bold">Distance</th>
                    <th scope="col" className="py-1.5 pr-2 font-bold">{t('Canal')}</th>
                    <th scope="col" className="py-1.5 font-bold">{t('Réponse')}</th>
                    <th scope="col" className="py-1.5 font-bold">
                      <span className="sr-only">{t('Téléphone')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {donors.map((d) => {
                    const Icon = d.volunteer ? HandHeart : (CHANNEL_ICON[d.channel] ?? Smartphone);
                    const ds = DONOR_STATUS[d.status] ?? { label: d.status, tone: 'muted' as const };
                    return (
                      <tr key={d.id}>
                        <td className="py-1.5 pr-2">
                          <span className="font-bold">{d.firstName}</span> <span className="text-sm text-[var(--fg-muted)]">{d.city}</span>
                        </td>
                        <td className="num py-1.5 pr-2 font-bold">{d.bloodGroup}</td>
                        <td className="num py-1.5 pr-2 text-right">{kmIn(d.distanceKm, locale)}</td>
                        <td className="py-1.5 pr-2">
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <Icon size={16} aria-hidden /> {d.volunteer ? t('S’est proposé') : t(CHANNEL_LABEL[d.channel] ?? d.channel)}
                          </span>
                        </td>
                        <td className="py-1.5">
                          <Pill tone={ds.tone}>{t(ds.label)}</Pill>
                          {d.status === 'ACCEPTEE' && d.appointment && <span className="ml-2 text-sm text-[var(--color-brand-700)]">{t('RDV {when}', { when: whenFr(d.appointment, t, locale) })}</span>}
                        </td>
                        <td className="py-1.5">
                          {d.phone && (
                            <a href={`tel:${d.phone}`} className="btn btn-ghost !min-h-11 !px-3 text-sm" aria-label={t('Appeler {name} pour organiser le don', { name: d.firstName })}>
                              <Phone size={16} aria-hidden /> {fmtPhone(d.phone)}
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* La banque de sang peut aussi clore la demande, en cochant les donneurs réellement venus. */}
          {detail && OPEN.has(detail.status) && (
            <div className="mt-3">
              {serving ? (
                <ServedConfirm
                  requestId={r.id}
                  donors={donors}
                  onCancel={() => setServing(false)}
                  onDone={(res) => {
                    setServing(false);
                    setNote(`${t('Transfusion faite : demande clôturée.')}${res.donorsRecorded ? ` ${t(res.donorsRecorded > 1 ? '{n} dons inscrits.' : '{n} don inscrit.', { n: res.donorsRecorded })}` : ''}`);
                    void load();
                  }}
                />
              ) : (
                <button type="button" className="btn btn-ghost !min-h-11 text-base" onClick={() => setServing(true)}>
                  <Check size={18} aria-hidden /> {t('Transfusion faite')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

type Reserved = LiveRequest & { reservation: { units: number; draw: { bloodGroup: string; units: number }[]; site: string; complete: boolean } };

/** Réserver des poches du stock du site pour une demande : le stock baisse, le médecin est prévenu. */
function Reserve({ requestId, max, available, missing, onDone }: { requestId: string; max: number; available: number; missing: number; onDone: (r: Reserved) => void }) {
  const t = useT();
  const [n, setN] = useState(Math.max(1, max));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const units = Math.min(Math.max(1, n), Math.max(1, max));

  async function reserve() {
    setBusy(true);
    setError(null);
    try {
      onDone(await api<Reserved>(`/blood/requests/${requestId}/reserve`, { method: 'POST', json: { units } }));
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Réservation impossible. Réessayez.'));
    } finally {
      setBusy(false);
    }
  }

  if (max < 1) {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-2xl bg-[var(--bg)] p-3 text-sm text-[var(--fg-muted)]">
        <Warehouse size={18} aria-hidden /> {t('Aucune poche compatible dans votre stock pour cette demande.')}
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
      <Warehouse size={20} aria-hidden className="shrink-0" />
      <p className="min-w-0 flex-1 basis-48 text-sm">
        {t('Votre stock : {n} poche(s) compatible(s). Il manque {missing} poche(s).', { n: available, missing })}
      </p>
      <div className="flex items-center gap-1" role="group" aria-label={t('Nombre de poches à réserver')}>
        <button type="button" className="chip-round !h-11 !w-11" onClick={() => setN(units - 1)} disabled={units <= 1 || busy} aria-label={t('Une poche de moins')}>
          <Minus size={18} aria-hidden />
        </button>
        <output className="num w-8 text-center text-xl font-bold" aria-live="polite">
          {units}
        </output>
        <button type="button" className="chip-round !h-11 !w-11" onClick={() => setN(units + 1)} disabled={units >= max || busy} aria-label={t('Une poche de plus')}>
          <Plus size={18} aria-hidden />
        </button>
      </div>
      <button type="button" className="btn btn-primary !min-h-11 text-base" onClick={() => void reserve()} disabled={busy}>
        {busy ? t('Réservation…') : t(units > 1 ? 'Réserver {n} poches' : 'Réserver {n} poche', { n: units })}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm font-bold text-[var(--color-ocre-700)]">
          {error}
        </p>
      )}
    </div>
  );
}
