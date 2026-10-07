import { Download, ExternalLink, FileText, ImageIcon, Lock, Pill } from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';
import { serverApi, ServerApiError } from '@/lib/server-api';

interface DocRef {
  id: string;
  kind: string;
  title: string;
  mime: string;
  size: number;
  createdAt: string;
}
interface Rx {
  id: string;
  status: string;
  statusLabel: string;
  items: {
    dci: string;
    strength?: string;
    dosage: string;
    duration?: string;
  }[];
  prescriber: string;
  issuedAt: string;
  expiresAt: string;
  dispensedAt?: string | null;
  dispensedByName?: string | null;
}

/** Volet du dossier : données, volet non partagé par le patient (403), ou indisponible. */
type Part<T> = { data: T } | { locked: true } | { error: true };

async function part<T>(path: string): Promise<Part<T>> {
  try {
    return { data: await serverApi<T>(path) };
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 403) return { locked: true };
    if (e instanceof ServerApiError) return { error: true };
    throw e;
  }
}

const KIND: Record<string, string> = {
  RESULTAT: 'Résultat',
  ORDONNANCE: 'Ordonnance',
  COMPTE_RENDU: 'Compte rendu',
  IMAGERIE: 'Imagerie',
  AUTRE: 'Document',
};
const RX_TONE: Record<string, string> = {
  ACTIVE: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  DISPENSED: 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]',
};

/**
 * Documents et ordonnances du patient, chacun derrière son propre volet de partage : ce que le patient
 * n'a pas coché reste fermé, et chaque ouverture de document est inscrite à son journal d'accès.
 */
export async function SharedRecords({ patientId }: { patientId: string }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const [docs, rx] = await Promise.all([part<DocRef[]>(`/patients/${patientId}/documents`), part<Rx[]>(`/patients/${patientId}/prescriptions`)]);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section aria-labelledby="h-docs" className="card p-5">
        <h2 id="h-docs" className="flex items-center gap-2 text-xl font-bold">
          <FileText size={20} aria-hidden /> {t('Documents')}
          {'data' in docs && docs.data.length > 0 && <span className="num text-base font-normal text-[var(--fg-muted)]">· {docs.data.length}</span>}
        </h2>
        {'locked' in docs ? (
          <Locked t={t} hint={t('Le patient peut cocher « Documents » lors de son prochain partage.')} />
        ) : 'error' in docs ? (
          <p className="mt-3 text-[var(--fg-muted)]">{t('Documents indisponibles pour le moment.')}</p>
        ) : docs.data.length === 0 ? (
          <p className="mt-3 text-[var(--fg-muted)]">{t('Aucun document dans le carnet.')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {docs.data.map((d) => (
              <DocRow key={d.id} d={d} patientId={patientId} t={t} locale={locale} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-rx" className="card p-5">
        <h2 id="h-rx" className="flex items-center gap-2 text-xl font-bold">
          <Pill size={20} aria-hidden /> {t('Ordonnances')}
          {'data' in rx && rx.data.length > 0 && <span className="num text-base font-normal text-[var(--fg-muted)]">· {rx.data.length}</span>}
        </h2>
        {'locked' in rx ? (
          <Locked t={t} hint={t('Le patient peut cocher « Ordonnances » lors de son prochain partage.')} />
        ) : 'error' in rx ? (
          <p className="mt-3 text-[var(--fg-muted)]">{t('Ordonnances indisponibles pour le moment.')}</p>
        ) : rx.data.length === 0 ? (
          <p className="mt-3 text-[var(--fg-muted)]">{t('Aucune ordonnance.')}</p>
        ) : (
          <RxList items={rx.data} t={t} locale={locale} />
        )}
      </section>
    </div>
  );
}

/** Les trois plus récentes, les autres au dépliage. */
function RxList({ items, t, locale }: { items: Rx[]; t: T; locale: Locale }) {
  const card = (r: Rx) => (
    <li key={r.id} className="rounded-2xl border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--fg-muted)]">
          {fmtDate(r.issuedAt, { day: 'numeric', month: 'short', year: 'numeric' }, locale)} · {r.prescriber}
        </p>
        <span className={`pill ${RX_TONE[r.status] ?? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'}`}>{t(r.statusLabel)}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {r.items.map((i, k) => (
          <li key={k}>
            <span className="font-bold">
              {i.dci}
              {i.strength ? ` ${i.strength}` : ''}
            </span>{' '}
            <span className="text-[0.95rem]">
              · {i.dosage}
              {i.duration ? ` · ${i.duration}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {r.dispensedByName && <p className="mt-1 text-sm text-[var(--fg-muted)]">{t('Délivrée par {who}', { who: r.dispensedByName })}</p>}
    </li>
  );
  return (
    <>
      <ul className="mt-3 space-y-3">{items.slice(0, 3).map(card)}</ul>
      {items.length > 3 && (
        <details className="group mt-3">
          <summary className="btn btn-ghost !min-h-11 w-full cursor-pointer list-none text-base">
            <span className="group-open:hidden">{t('Voir les {n} autres', { n: items.length - 3 })}</span>
            <span className="hidden group-open:inline">{t('Masquer')}</span>
          </summary>
          <ul className="mt-3 space-y-3">{items.slice(3).map(card)}</ul>
        </details>
      )}
    </>
  );
}

function DocRow({ d, patientId, t, locale }: { d: DocRef; patientId: string; t: T; locale: Locale }) {
  const Icon = d.mime.startsWith('image/') ? ImageIcon : FileText;
  const href = `/api/patients/${patientId}/documents/${d.id}`;
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-bold">{d.title}</p>
        <p className="text-sm text-[var(--fg-muted)]">
          {t(KIND[d.kind] ?? 'Document')} · {fmtDate(d.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }, locale)} ·{' '}
          <span className="num">{Math.max(1, Math.round(d.size / 1024))} Ko</span>
        </p>
      </div>
      <div className="flex gap-2">
        <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-11 !px-4 text-base">
          <ExternalLink size={16} aria-hidden /> {t('Ouvrir')}
          <span className="sr-only">
            {d.title} {t('(nouvel onglet)')}
          </span>
        </a>
        <a href={`${href}?download=1`} download className="btn btn-ghost !min-h-11 !w-11 !p-0" aria-label={t('Télécharger {title}', { title: d.title })}>
          <Download size={18} aria-hidden />
        </a>
      </div>
    </li>
  );
}

function Locked({ t, hint }: { t: T; hint: string }) {
  return (
    <div className="mt-3 flex items-start gap-3 rounded-2xl bg-[var(--bg)] p-4">
      <Lock size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
      <div>
        <p className="font-bold">{t('Non partagé par le patient')}</p>
        <p className="text-sm text-[var(--fg-muted)]">{hint}</p>
      </div>
    </div>
  );
}
