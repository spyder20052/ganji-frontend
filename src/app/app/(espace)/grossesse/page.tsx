import type { Metadata } from 'next';
import { Check, Clock, MapPin } from 'lucide-react';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';
import { Empty, ErrorNote, Notice, PageHead, Section } from '../../_components/ui';
import { load } from '../../_lib/load';
import { DangerSigns, type DangerSign } from './DangerSigns';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Ma grossesse') };
}

interface Visit { id: string; code: string; label: string; content: string[]; dueFrom: string; dueTo: string; doneAt: string | null; place: string | null; status: 'faite' | 'à venir' | 'en retard' }
interface Pregnancy {
  id: string;
  lmp: string;
  edd: string;
  maternity: string | null;
  weeksAmenorrhea: number;
  daysAmenorrhea: number;
  termLabel: string;
  trimester: 1 | 2 | 3;
  daysToTerm: number;
  visits: Visit[];
  nextVisit: Visit | null;
  dangerSignsCatalogue: DangerSign[];
  recordedDangerSigns: { code: string; at: string; reportedBy: string; label: string; urgency: string | null }[];
}

const VISIT_STYLE: Record<Visit['status'], { box: string; dot: string; text: string }> = {
  faite: { box: 'bg-[var(--color-brand-50)] text-[var(--color-brand-950)]', dot: 'bg-[var(--color-brand-700)] text-white', text: 'Faite' },
  'à venir': { box: 'bg-[var(--bg)]', dot: 'bg-[var(--card)] ring-2 ring-[var(--border)]', text: 'À venir' },
  'en retard': { box: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]', dot: 'bg-[var(--color-ocre-500)] text-white', text: 'En retard' },
};

/** Suffixe ordinal du trimestre (1er, 2e, 3e / 1st, 2nd, 3rd) : il dépend du chiffre, pas seulement de la langue. */
const ORDINAL: Record<Locale, [string, string, string]> = { fr: ['er', 'e', 'e'], en: ['st', 'nd', 'rd'] };

export default async function GrossessePage() {
  const t = await getT();
  const locale = await getLocale();
  const res = await load<Pregnancy | null>('/maternal/pregnancy');
  const p = res.data;

  if (!p) {
    return (
      <I18nScope area="patient2">
        <PageHead icon="pregnant" title={t('Ma grossesse')} />
        {res.error ? <ErrorNote error={res.error} /> : <Empty>{t('Aucun suivi de grossesse en cours. À la première consultation prénatale, la sage-femme l’ouvre dans votre carnet.')}</Empty>}
      </I18nScope>
    );
  }

  const next = p.nextVisit;
  const listen = [
    p.trimester === 1
      ? t("Vous êtes à {n} semaines d'aménorrhée, au premier trimestre.", { n: p.weeksAmenorrhea })
      : p.trimester === 2
        ? t("Vous êtes à {n} semaines d'aménorrhée, au deuxième trimestre.", { n: p.weeksAmenorrhea })
        : t("Vous êtes à {n} semaines d'aménorrhée, au troisième trimestre.", { n: p.weeksAmenorrhea }),
    t('Le bébé est attendu vers le {date}.', { date: fmtDate(p.edd, { day: 'numeric', month: 'long' }, locale) }),
    next ? t('Prochaine consultation : {label}, {when}.', { label: t(next.label), when: visitWindow(next.dueFrom, next.dueTo, 'long', t, locale) }) : '',
    t('En cas de saignement, de convulsions, de maux de tête violents, de perte des eaux ou si le bébé ne bouge plus : allez tout de suite à la maternité.'),
  ].join(' ');
  // Même forme que le libellé calculé par l'API (« 24 SA + 3 j »), traduisible.
  const term = p.daysAmenorrhea ? t('{w} SA + {d} j', { w: p.weeksAmenorrhea, d: p.daysAmenorrhea }) : t('{w} SA', { w: p.weeksAmenorrhea });

  return (
    <I18nScope area="patient2">
      <PageHead icon="pregnant" title={t('Ma grossesse')} listen={listen} audioKey="app.grossesse" />

      <section aria-labelledby="h-terme" className="grid gap-4 sm:grid-cols-3">
        <div className="card flex flex-col items-center justify-center gap-1 !border-0 bg-[var(--color-brand-900)] p-6 text-center text-white sm:col-span-1">
          <h2 id="h-terme" className="label !text-[var(--color-brand-200)]">{t('Semaines d’aménorrhée')}</h2>
          <p className="num text-7xl font-bold leading-none">{p.weeksAmenorrhea}</p>
          <p className="text-lg">{term}</p>
        </div>
        <div className="card grid grid-cols-2 gap-3 p-5 sm:col-span-2">
          <div className="rounded-2xl bg-[var(--bg)] p-4">
            <p className="label">{t('Trimestre')}</p>
            <p className="num text-4xl font-bold">{p.trimester}<span className="text-xl">{ORDINAL[locale][p.trimester - 1]}</span></p>
          </div>
          <div className="rounded-2xl bg-[var(--bg)] p-4">
            <p className="label">{t('Terme prévu')}</p>
            <p className="text-2xl font-bold">{fmtDate(p.edd, { day: 'numeric', month: 'long' }, locale)}</p>
            <p className="text-base text-[var(--fg-muted)]">{p.daysToTerm > 0 ? t('dans {n} jours', { n: p.daysToTerm }) : t('terme atteint')}</p>
          </div>
          <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-[var(--color-brand-100)] p-4 text-[var(--color-brand-900)]">
            <Clock size={24} aria-hidden className="shrink-0" />
            <p className="text-lg">
              {next ? (
                <>
                  <strong>{t('Prochaine visite :')}</strong> {t(next.label)}, {visitWindow(next.dueFrom, next.dueTo, 'short', t, locale)}
                  {p.maternity ? ` · ${p.maternity}` : ''}
                </>
              ) : (
                t('Toutes les consultations prénatales sont faites. Bravo !')
              )}
            </p>
          </div>
        </div>
      </section>

      <Section id="h-danger" title={t('Signes de danger')} icon="warning">
        <p className="mb-4 text-base text-[var(--fg-muted)]">{t('Touchez ce que vous ressentez. Ganji vous dit quoi faire et prévient votre relais si c’est urgent.')}</p>
        <DangerSigns pregnancyId={p.id} catalogue={p.dangerSignsCatalogue} />
        {p.recordedDangerSigns.length > 0 && (
          <details className="simple-hide mt-4">
            <summary className="cursor-pointer py-2 font-bold">{t('Signes déjà signalés ({n})', { n: p.recordedDangerSigns.length })}</summary>
            <ul className="mt-2 space-y-1 text-base">
              {p.recordedDangerSigns.map((s) => (
                <li key={`${s.code}-${s.at}`}>
                  {fmtDate(s.at, { day: 'numeric', month: 'long' }, locale)} · <strong>{t(s.label)}</strong> · {t('signalé par {name}', { name: s.reportedBy })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      <Section id="h-cpn" title={t('Mes consultations prénatales')} icon="calendar" className="simple-hide">
        {p.visits.some((v) => v.status === 'en retard') && (
          <div className="mb-4">
            <Notice tone="warn" title={t('Une consultation est en retard')}>{t('Allez au centre de santé dès que possible : ce n’est pas trop tard.')}</Notice>
          </div>
        )}
        <ol className="relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-5 before:w-0.5 before:bg-[var(--border)]">
          {p.visits.map((v, i) => {
            const st = VISIT_STYLE[v.status];
            return (
              <li key={v.id} className="relative flex gap-4">
                <span className={`z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${st.dot}`}>
                  {v.status === 'faite' ? <Check size={20} aria-hidden /> : <span className="num">{i + 1}</span>}
                </span>
                <div className={`min-w-0 flex-1 rounded-2xl p-4 ${st.box}`}>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="pill bg-white/70 text-[var(--color-ink)] ring-1 ring-black/10">{t(st.text)}</span>
                    <span className="text-base font-bold">
                      {v.doneAt
                        ? t('le {date}', { date: fmtDate(v.doneAt, { day: 'numeric', month: 'long' }, locale) })
                        : t('du {from} au {to}', { from: fmtDate(v.dueFrom, { day: 'numeric', month: 'short' }, locale), to: fmtDate(v.dueTo, { day: 'numeric', month: 'short' }, locale) })}
                    </span>
                  </p>
                  <p className="mt-1 text-lg font-bold">{t(v.label)}</p>
                  {v.place && (
                    <p className="flex items-center gap-1 text-base"><MapPin size={16} aria-hidden /> {v.place}</p>
                  )}
                  {v.content.length > 0 && v.status !== 'faite' && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-base font-bold">{t('Ce qui sera fait')}</summary>
                      <ul className="mt-1 list-disc pl-5 text-base">
                        {v.content.map((c) => <li key={c}>{t(c)}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>
    </I18nScope>
  );
}

/** « le 25 sept. » quand la fenêtre tient en un jour, sinon « entre le 12 et le 26 nov. ». */
function visitWindow(from: string, to: string, month: 'long' | 'short', t: T, locale: Locale) {
  const a = fmtDate(from, { day: 'numeric', month }, locale);
  const b = fmtDate(to, { day: 'numeric', month }, locale);
  return a === b ? t('le {date}', { date: a }) : t('entre le {a} et le {b}', { a, b });
}
