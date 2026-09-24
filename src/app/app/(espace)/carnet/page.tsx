import type { Metadata } from 'next';
import Link from 'next/link';
import { EyeOff, Phone } from 'lucide-react';
import { LineChart } from '@/components/LineChart';
import { Pictogram } from '@/components/Pictogram';
import { fmtDate, fmtDateTime } from '@/lib/format';
import type { Series, Summary, TimelineItem } from '@/lib/types';
import { Empty, ErrorNote, Notice, PageHead, Section } from '../../_components/ui';
import { TIMELINE_ICON } from '../../_lib/labels';
import { getMe, load, type Loaded } from '../../_lib/load';
import { DocumentOpen, DocumentUpload } from './Documents';

export const metadata: Metadata = { title: 'Mon carnet' };

interface DocRef { id: string; kind: string; title: string; mime: string; size: number; createdAt: string }

const DOC_KIND: Record<string, string> = { RESULTAT: 'Résultat', ORDONNANCE: 'Ordonnance', COMPTE_RENDU: 'Compte rendu', IMAGERIE: 'Imagerie', AUTRE: 'Autre' };
const VIA: Record<string, string> = { DELEGATION: 'en tant qu’aidant', PARENT: 'en tant que parent', CARE_TEAM: 'équipe de soins', CONSENT: 'avec son accord', BREAK_GLASS: 'accès d’urgence' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CarnetPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const [{ patient }, me] = await Promise.all([searchParams, getMe()]);
  const patientId = patient && UUID.test(patient) ? patient : me.patientId;

  if (!patientId) {
    return (
      <>
        <PageHead icon="carnet" title="Carnet de santé" intro="Vous n’avez pas encore de carnet personnel sur Alafia." />
        {me.delegations.length > 0 ? (
          <Section id="h-choisir" title="Carnets que vous pouvez ouvrir" icon="people">
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
          <Empty>Un centre de santé ou un relais peut créer votre carnet avec votre NPI.</Empty>
        )}
      </>
    );
  }

  const base = `/patients/${patientId}`;
  // Aidant : on ne demande que ce que la délégation couvre (sinon chaque refus s'inscrit au journal du patient).
  const delegation = patientId === me.patientId ? null : me.delegations.find((d) => d.patient.id === patientId);
  const allowed = (scope: string) => !delegation || delegation.scopes.includes('all') || delegation.scopes.includes(scope);
  const notShared = <T,>(): Promise<Loaded<T>> =>
    Promise.resolve({ data: null, error: `${delegation?.patient.firstName ?? 'La personne'} n’a pas partagé cette partie de son carnet avec vous.`, status: 403 });
  const [sumRes, tlRes, obsRes, docRes] = await Promise.all([
    load<Summary>(`${base}/summary`),
    allowed('timeline') ? load<TimelineItem[]>(`${base}/timeline`) : notShared<TimelineItem[]>(),
    allowed('observations') ? load<Series[]>(`${base}/observations`) : notShared<Series[]>(),
    allowed('documents') ? load<DocRef[]>(`${base}/documents`) : notShared<DocRef[]>(),
  ]);
  const s = sumRes.data;
  const own = patientId === me.patientId;
  const who = own ? 'Mon carnet' : `Carnet de ${s?.firstName ?? 'la personne aidée'}`;

  const listen = s
    ? [
        `${who}.`,
        s.bloodGroup ? `Groupe sanguin ${s.bloodGroup.replace('+', ' positif').replace('-', ' négatif')}.` : 'Groupe sanguin inconnu.',
        s.allergies.length ? `Allergies : ${s.allergies.join(', ')}.` : 'Aucune allergie connue.',
        s.treatments ? `Traitement : ${s.treatments}.` : '',
        s.emergencyContact ? `Personne à prévenir : ${s.emergencyContact.name}.` : '',
      ].join(' ')
    : `${who}.`;

  return (
    <>
      <PageHead icon="carnet" title={who} listen={listen} audioKey="app.carnet" intro={s ? `${s.firstName} ${s.lastName} · ${s.age} ans${s.commune ? ` · ${s.commune}` : ''}` : undefined}>
        {own && (
          <Link href="/app/partage" className="btn btn-primary">
            <Pictogram name="qr" size={20} /> Montrer au soignant
          </Link>
        )}
      </PageHead>

      {s && !own && s.access.via !== 'OWNER' && (
        <Notice tone="info" title={`Vous consultez ce carnet ${VIA[s.access.via] ?? ''}`}>
          {s.firstName} voit dans son journal d’accès chaque consultation que vous faites.
        </Notice>
      )}

      {/* Fiche vitale */}
      <Section id="h-fiche" title="Fiche vitale" icon="heart">
        {sumRes.error && <ErrorNote error={sumRes.error} />}
        {s && (
          <div className="grid gap-4 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center rounded-3xl bg-[var(--color-danger-50)] px-8 py-6 text-[var(--color-danger-800)]">
              <Pictogram name="blood" size={30} />
              <p className="num text-6xl font-bold leading-none">{s.bloodGroup ?? '?'}</p>
              <p className="mt-1 text-sm font-bold">Groupe sanguin</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <dt className="label">Allergies</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {s.allergies.length ? (
                    s.allergies.map((a) => (
                      <span key={a} className="pill bg-[var(--color-ocre-100)] text-base text-[var(--color-ocre-700)]">
                        {a}
                      </span>
                    ))
                  ) : (
                    <span>Aucune connue</span>
                  )}
                </dd>
              </div>
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <dt className="label">Traitement en cours</dt>
                <dd className="mt-1 font-bold">{s.treatments ?? 'Aucun renseigné'}</dd>
              </div>
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <dt className="label">Maladies suivies</dt>
                <dd className="mt-1">
                  {s.conditions.length ? (
                    <ul className="space-y-1">
                      {s.conditions.map((c) => (
                        <li key={c.id}>
                          <span className="font-bold">{c.label ?? c.code}</span>
                          {c.since && <span className="text-base text-[var(--fg-muted)]"> · depuis {fmtDate(c.since, { month: 'long', year: 'numeric' })}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Aucune'
                  )}
                  {s.hiddenSensitive && (
                    <p className="mt-2 flex items-start gap-2 text-base text-[var(--fg-muted)]">
                      <EyeOff size={18} aria-hidden className="mt-1 shrink-0" />
                      Des données très sensibles sont masquées. Elles ne sont montrées qu’avec un accord spécial.
                    </p>
                  )}
                </dd>
              </div>
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <dt className="label">Personne à prévenir</dt>
                <dd className="mt-1">
                  {s.emergencyContact ? (
                    <>
                      <p className="font-bold">{s.emergencyContact.name}</p>
                      {s.emergencyContact.phone && (
                        <a href={`tel:${s.emergencyContact.phone}`} className="btn btn-soft mt-2 !min-h-11">
                          <Phone size={18} aria-hidden /> <span className="num">{s.emergencyContact.phone}</span>
                        </a>
                      )}
                    </>
                  ) : (
                    'Non renseignée'
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
        {s && s.careTeam.length > 0 && (
          <div className="mt-5">
            <h3 className="label mb-2">Équipe de soins</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {s.careTeam.map((m) => (
                <li key={`${m.name}-${m.role}`} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3">
                  <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]"><Pictogram name="stethoscope" size={20} /></span>
                  <span>
                    <span className="block font-bold">{m.name}</span>
                    <span className="block text-base text-[var(--fg-muted)]">{[m.specialty, m.facility].filter(Boolean).join(' · ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Chronologie */}
      <Section id="h-chrono" title="Mes soins, du plus récent au plus ancien" icon="calendar" className="simple-hide">
        {tlRes.error && <ErrorNote error={tlRes.error} />}
        {tlRes.data && tlRes.data.length === 0 && <Empty>Aucun soin enregistré pour le moment.</Empty>}
        {tlRes.data && tlRes.data.length > 0 && (
          <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-6 before:w-0.5 before:bg-[var(--border)]">
            {tlRes.data.map((t) => {
              const blood = t.kind === 'TRANSFUSION';
              return (
                <li key={`${t.kind}-${t.id}`} className="relative flex gap-4">
                  <span
                    className={`z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--card)] ${blood ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}
                  >
                    <Pictogram name={TIMELINE_ICON[t.kind] ?? 'stethoscope'} size={22} />
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl bg-[var(--bg)] p-4">
                    <p className="text-sm font-bold text-[var(--fg-muted)]">
                      <time dateTime={t.date}>{fmtDate(t.date)}</time>
                      {t.place ? ` · ${t.place}` : ''}
                    </p>
                    <p className="text-lg font-bold">{t.title}</p>
                    {t.detail && <p className="text-base">{t.detail}</p>}
                    {t.author && <p className="text-sm text-[var(--fg-muted)]">Par {t.author}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      {/* Analyses */}
      <Section id="h-analyses" title="Mes analyses dans le temps" icon="heart" className="simple-hide">
        {obsRes.error && <ErrorNote error={obsRes.error} />}
        {obsRes.data && obsRes.data.length === 0 && <Empty>Aucun résultat d’analyse pour le moment.</Empty>}
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
      <Section id="h-docs" title="Mes documents" icon="document">
        {docRes.error && <ErrorNote error={docRes.error} />}
        {docRes.data && docRes.data.length === 0 && <Empty>Aucun document. Prenez en photo un résultat ou un compte rendu papier.</Empty>}
        {docRes.data && docRes.data.length > 0 && (
          <ul className="mb-5 divide-y divide-[var(--border)]">
            {docRes.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]"><Pictogram name="document" size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{d.title}</span>
                  <span className="block text-sm text-[var(--fg-muted)]">
                    {DOC_KIND[d.kind] ?? d.kind} · {fmtDateTime(d.createdAt)} · <span className="num">{Math.max(1, Math.round(d.size / 1024))} Ko</span>
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
