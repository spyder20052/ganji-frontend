import type { Metadata } from 'next';
import Link from 'next/link';
import { EyeOff, Phone } from 'lucide-react';
import { LineChart } from '@/components/LineChart';
import { Pictogram } from '@/components/Pictogram';
import { getLocale, getT } from '@/i18n/server';
import type { Locale } from '@/i18n/translate';
import { fmtDate, fmtDateTime, fmtPhone } from '@/lib/format';
import type { Series, Summary, TimelineItem } from '@/lib/types';
import { Empty, ErrorNote, Notice, PageHead, Section } from '../../_components/ui';
import { TIMELINE_ICON } from '../../_lib/labels';
import { getMe, load, type Loaded } from '../../_lib/load';
import { DocumentOpen, DocumentUpload } from './Documents';
import { SPECIALTY_LABEL } from '../../../pro/_lib/labels';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Mon carnet') };
}

interface DocRef { id: string; kind: string; title: string; mime: string; size: number; createdAt: string }

const DOC_KIND: Record<string, string> = { RESULTAT: 'Résultat', ORDONNANCE: 'Ordonnance', COMPTE_RENDU: 'Compte rendu', IMAGERIE: 'Imagerie', AUTRE: 'Autre' };
const VIA: Record<string, string> = { DELEGATION: 'en tant qu’aidant', PARENT: 'en tant que parent', CARE_TEAM: 'équipe de soins', CONSENT: 'avec son accord', BREAK_GLASS: 'accès d’urgence' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CarnetPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const [{ patient }, me, t, locale] = await Promise.all([searchParams, getMe(), getT(), getLocale()]);
  const patientId = patient && UUID.test(patient) ? patient : me.patientId;

  if (!patientId) {
    return (
      <>
        <PageHead icon="carnet" title={t('Carnet de santé')} intro={t('Vous n’avez pas encore de carnet personnel sur Ganji.')} />
        {me.delegations.length > 0 ? (
          <Section id="h-choisir" title={t('Carnets que vous pouvez ouvrir')} icon="people">
            <ul className="grid gap-3 sm:grid-cols-2">
              {me.delegations.map((d) => (
                <li key={d.patient.id}>
                  <Link href={`/app/carnet?patient=${d.patient.id}`} className="btn btn-soft w-full">
                    {d.patient.firstName} ({d.relation})
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : (
          <Empty>{t('Un centre de santé ou un relais peut créer votre carnet avec votre NPI.')}</Empty>
        )}
      </>
    );
  }

  const base = `/patients/${patientId}`;
  // Aidant : on ne demande que ce que la délégation couvre (sinon chaque refus s'inscrit au journal du patient).
  const delegation = patientId === me.patientId ? null : me.delegations.find((d) => d.patient.id === patientId);
  const allowed = (scope: string) => !delegation || delegation.scopes.includes('all') || delegation.scopes.includes(scope);
  const notShared = <T,>(): Promise<Loaded<T>> =>
    Promise.resolve({ data: null, error: t('{prenom} n’a pas partagé cette partie de son carnet avec vous.', { prenom: delegation?.patient.firstName ?? t('La personne') }), status: 403 });
  const [sumRes, tlRes, obsRes, docRes] = await Promise.all([
    load<Summary>(`${base}/summary`),
    allowed('timeline') ? load<TimelineItem[]>(`${base}/timeline`) : notShared<TimelineItem[]>(),
    allowed('observations') ? load<Series[]>(`${base}/observations`) : notShared<Series[]>(),
    allowed('documents') ? load<DocRef[]>(`${base}/documents`) : notShared<DocRef[]>(),
  ]);
  const s = sumRes.data;
  const own = patientId === me.patientId;
  const who = own ? t('Mon carnet') : s?.firstName ? t('Carnet de {prenom}', { prenom: s.firstName }) : t('Carnet de la personne aidée');

  const listen = s
    ? [
        `${who}.`,
        s.bloodGroup
          ? t('Groupe sanguin {group}.', { group: s.bloodGroup.replace('+', ` ${t('positif')}`).replace('-', ` ${t('négatif')}`) })
          : t('Groupe sanguin inconnu.'),
        s.allergies.length ? t('Allergies : {list}.', { list: s.allergies.join(', ') }) : t('Aucune allergie connue.'),
        s.treatments ? t('Traitement : {treatment}.', { treatment: s.treatments }) : '',
        s.emergencyContact ? t('Personne à prévenir : {name}.', { name: s.emergencyContact.name }) : '',
      ].join(' ')
    : `${who}.`;

  return (
    <>
      <PageHead icon="carnet" title={who} listen={listen} audioKey="app.carnet" intro={s ? `${s.firstName} ${s.lastName} · ${t('{age} ans', { age: s.age })}${s.commune ? ` · ${s.commune}` : ''}` : undefined}>
        {own && (
          <Link href="/app/partage" className="btn btn-primary">
            <Pictogram name="qr" size={20} /> {t('Montrer au soignant')}
          </Link>
        )}
      </PageHead>

      {s && !own && s.access.via !== 'OWNER' && (
        <Notice tone="info" title={t('Vous consultez ce carnet {via}', { via: VIA[s.access.via] ? t(VIA[s.access.via]) : '' })}>
          {t('{prenom} voit dans son journal d’accès chaque consultation que vous faites.', { prenom: s.firstName })}
        </Notice>
      )}

      {/* Fiche vitale */}
      <Section id="h-fiche" title={t('Fiche vitale')} icon="heart">
        {sumRes.error && <ErrorNote error={sumRes.error} />}
        {s && (
          <div className="grid gap-4 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center rounded-3xl bg-[var(--color-danger-50)] px-8 py-6 text-[var(--color-danger-800)]">
              <Pictogram name="blood" size={30} />
              <p className="display text-[4.5rem]">{s.bloodGroup ?? '?'}</p>
              <p className="mt-1 text-sm font-bold">{t('Groupe sanguin')}</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <dt className="label">{t('Allergies')}</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {s.allergies.length ? (
                    s.allergies.map((a) => (
                      <span key={a} className="pill bg-[var(--color-ocre-100)] text-base text-[var(--color-ocre-700)]">
                        {a}
                      </span>
                    ))
                  ) : (
                    <span>{t('Aucune connue')}</span>
                  )}
                </dd>
              </div>
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <dt className="label">{t('Traitement en cours')}</dt>
                <dd className="mt-1 font-bold">{s.treatments ?? t('Aucun renseigné')}</dd>
              </div>
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <dt className="label">{t('Maladies suivies')}</dt>
                <dd className="mt-1">
                  {s.conditions.length ? (
                    <ul className="space-y-1">
                      {s.conditions.map((c) => (
                        <li key={c.id}>
                          <span className="font-bold">{c.label ?? c.code}</span>
                          {c.since && <span className="text-base text-[var(--fg-muted)]"> · {t('depuis {date}', { date: fmtDate(c.since, { month: 'long', year: 'numeric' }, locale) })}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    t('Aucune')
                  )}
                  {s.hiddenSensitive && (
                    <p className="mt-2 flex items-start gap-2 text-base text-[var(--fg-muted)]">
                      <EyeOff size={18} aria-hidden className="mt-1 shrink-0" />
                      {t('Des données très sensibles sont masquées. Elles ne sont montrées qu’avec un accord spécial.')}
                    </p>
                  )}
                </dd>
              </div>
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <dt className="label">{t('Personne à prévenir')}</dt>
                <dd className="mt-1">
                  {s.emergencyContact ? (
                    <>
                      <p className="font-bold">{s.emergencyContact.name}</p>
                      {s.emergencyContact.phone && (
                        <a href={`tel:${s.emergencyContact.phone}`} className="btn btn-soft mt-2 !min-h-11">
                          <Phone size={18} aria-hidden /> <span className="num">{fmtPhone(s.emergencyContact.phone)}</span>
                        </a>
                      )}
                    </>
                  ) : (
                    t('Non renseignée')
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
        {s && s.careTeam.length > 0 && (
          <div className="mt-5">
            <h3 className="label mb-2">{t('Équipe de soins')}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {s.careTeam.map((m) => (
                <li key={`${m.name}-${m.role}`} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3">
                  <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]"><Pictogram name="stethoscope" size={20} /></span>
                  <span>
                    <span className="block font-bold">{m.name}</span>
                    <span className="block text-base text-[var(--fg-muted)]">{[m.specialty ? (SPECIALTY_LABEL[m.specialty] ? t(SPECIALTY_LABEL[m.specialty]) : m.specialty) : null, m.facility].filter(Boolean).join(' · ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Chronologie */}
      <Section id="h-chrono" title={t('Mes soins')} icon="calendar" className="simple-hide">
        {tlRes.error && <ErrorNote error={tlRes.error} />}
        {tlRes.data && tlRes.data.length === 0 && <Empty>{t('Aucun soin enregistré pour le moment.')}</Empty>}
        {tlRes.data && tlRes.data.length > 0 && (
          <>
            <Timeline items={tlRes.data.slice(0, RECENT)} locale={locale} />
            {tlRes.data.length > RECENT && (
              <details className="group mt-4">
                <summary className="btn btn-soft w-full cursor-pointer list-none">
                  <span className="group-open:hidden">{t('Voir tout l’historique ({n})', { n: tlRes.data.length })}</span>
                  <span className="hidden group-open:inline">{t('Masquer l’historique')}</span>
                </summary>
                <div className="mt-5">
                  <Timeline items={tlRes.data.slice(RECENT)} locale={locale} />
                </div>
              </details>
            )}
          </>
        )}
      </Section>

      {/* Analyses */}
      <Section id="h-analyses" title={t('Mes analyses')} icon="heart" className="simple-hide">
        {obsRes.error && <ErrorNote error={obsRes.error} />}
        {obsRes.data && obsRes.data.length === 0 && <Empty>{t('Aucun résultat d’analyse pour le moment.')}</Empty>}
        {obsRes.data && obsRes.data.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2">
            {obsRes.data.map((series) => (
              <div key={series.code} className="rounded-2xl border border-[var(--border)] p-4">
                <h3 className="mb-2 text-lg font-bold">
                  {series.label} <span className="text-base font-normal text-[var(--fg-muted)]">({series.unit})</span>
                </h3>
                <LineChart series={series} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Documents */}
      <Section id="h-docs" title={t('Mes documents')} icon="document">
        {docRes.error && <ErrorNote error={docRes.error} />}
        {docRes.data && docRes.data.length === 0 && <Empty>{t('Aucun document. Prenez en photo un résultat ou un compte rendu papier.')}</Empty>}
        {docRes.data && docRes.data.length > 0 && (
          <ul className="mb-5 divide-y divide-[var(--border)]">
            {docRes.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]"><Pictogram name="document" size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{d.title}</span>
                  <span className="block text-sm text-[var(--fg-muted)]">
                    {DOC_KIND[d.kind] ? t(DOC_KIND[d.kind]) : d.kind} · {fmtDateTime(d.createdAt, locale)} · <span className="num">{t('{n} Ko', { n: Math.max(1, Math.round(d.size / 1024)) })}</span>
                  </span>
                </span>
                <DocumentOpen patientId={patientId} docId={d.id} title={d.title} />
              </li>
            ))}
          </ul>
        )}
        {!docRes.error && <DocumentUpload patientId={patientId} />}
      </Section>
    </>
  );
}

/** Soins affichés d'emblée ; les plus anciens restent dans « Voir tout l'historique ». */
const RECENT = 4;

function Timeline({ items, locale }: { items: TimelineItem[]; locale: Locale }) {
  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-6 before:w-0.5 before:bg-[var(--border)]">
      {items.map((t) => {
        const blood = t.kind === 'TRANSFUSION';
        return (
          <li key={`${t.kind}-${t.id}`} className="relative flex gap-4">
            <span
              className={`z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--card)] ${blood ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}
            >
              <Pictogram name={TIMELINE_ICON[t.kind] ?? 'stethoscope'} size={22} />
            </span>
            <div className="min-w-0 flex-1 rounded-3xl bg-[var(--bg)] p-4">
              <p className="text-sm text-[var(--fg-muted)]">
                <time dateTime={t.date}>{fmtDate(t.date, { day: 'numeric', month: 'short', year: 'numeric' }, locale)}</time>
                {t.place ? ` · ${t.place}` : ''}
              </p>
              <p className="text-lg font-semibold">{t.title}</p>
              {t.detail && <p className="text-base">{t.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
