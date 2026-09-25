import type { Metadata } from 'next';
import { Check, Clock, AlertTriangle } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { Qr } from '@/components/Qr';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { T } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';
import { Empty, ErrorNote, PageHead } from '../../_components/ui';
import { load } from '../../_lib/load';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Mes enfants') };
}

interface Child { id: string; firstName: string; lastName: string; birthDate: string; sex: string; age: string; vaccination: { done: number; toDo: number; overdue: number } }
type VaxStatus = 'fait' | 'à faire' | 'en retard';
interface Imm { id: string; code: string; name: string; dose: number; disease: string | null; ageLabel: string | null; dueAt: string; givenAt: string | null; lot: string | null; place: string | null; status: VaxStatus }
interface ImmBook { child: Child; immunizations: Imm[]; next: Imm | null; proof: { qrPayload: string; given: string[]; issuedAt: string } }

const PILL: Record<VaxStatus, { cls: string; label: string; Icon: typeof Check }> = {
  fait: { cls: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', label: 'Fait', Icon: Check },
  'à faire': { cls: 'bg-[var(--bg)] text-[var(--fg)] ring-1 ring-[var(--border)]', label: 'À faire', Icon: Clock },
  'en retard': { cls: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]', label: 'En retard', Icon: AlertTriangle },
};

/** Âge calculé par l'API (« 3 jours », « 6 semaines », « 4 mois », « 2 ans ») : même phrase, traduite. */
const AGE = /^(\d+) (jour|jours|semaines|mois|ans)$/;
const AGE_UNIT: Record<string, string> = { jour: '{n} jour', jours: '{n} jours', semaines: '{n} semaines', mois: '{n} mois', ans: '{n} ans' };
function ageText(age: string, t: T) {
  const m = AGE.exec(age);
  return m ? t(AGE_UNIT[m[2]], { n: m[1] }) : age;
}

function groupByAge(list: Imm[]) {
  const groups: { label: string; items: Imm[] }[] = [];
  for (const i of list) {
    const label = i.ageLabel ?? 'Autres';
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(i);
    else groups.push({ label, items: [i] });
  }
  return groups;
}

export default async function EnfantsPage() {
  const t = await getT();
  const locale = await getLocale();
  const res = await load<Child[]>('/maternal/children');
  const kids = res.data ?? [];
  const books = await Promise.all(kids.map((k) => load<ImmBook>(`/maternal/children/${k.id}/immunizations`)));

  const listen = kids.length
    ? kids
        .map((k, n) => {
          const b = books[n].data;
          const vars = { name: k.firstName, age: ageText(k.age, t), n: k.vaccination.done, late: k.vaccination.overdue };
          const status = k.vaccination.overdue ? t('{name}, {age} : {n} vaccins faits, {late} en retard.', vars) : t('{name}, {age} : {n} vaccins faits.', vars);
          return `${status}${b?.next ? ` ${t('Prochain vaccin : {vaccine}, le {date}.', { vaccine: t(b.next.name), date: fmtDate(b.next.dueAt, { day: 'numeric', month: 'long' }, locale) })}` : ''}`;
        })
        .join(' ')
    : t('Aucun enfant rattaché à votre carnet.');

  return (
    <I18nScope area="patient2">
      <PageHead
        icon="baby"
        title={kids.length > 1 ? t('Mes enfants') : t('Mon enfant')}
        intro={t('Le carnet de vaccination suit le calendrier national (PEV). Un rappel part par SMS et par message vocal avant chaque vaccin.')}
        listen={listen}
        audioKey="app.enfants"
      />
      {res.error && <ErrorNote error={res.error} />}
      {res.data && kids.length === 0 && <Empty>{t('Aucun enfant rattaché à votre carnet. À la naissance, la maternité crée son carnet et le relie au vôtre.')}</Empty>}

      {kids.map((k, n) => {
        const b = books[n];
        const book = b.data;
        return (
          <section key={k.id} aria-labelledby={`h-${k.id}`} className="card space-y-5 p-5 sm:p-6">
            <header className="flex flex-wrap items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name="baby" size={28} /></span>
              <div className="min-w-0 flex-1">
                <h2 id={`h-${k.id}`} className="text-2xl font-bold">{k.firstName}</h2>
                <p className="text-base text-[var(--fg-muted)]">
                  {ageText(k.age, t)} · {k.sex === 'F' ? t('née le {date}', { date: fmtDate(k.birthDate, undefined, locale) }) : t('né le {date}', { date: fmtDate(k.birthDate, undefined, locale) })}
                </p>
              </div>
              <dl className="flex gap-2 text-center">
                <div className="rounded-2xl bg-[var(--color-brand-100)] px-3 py-2 text-[var(--color-brand-900)]"><dt className="text-sm font-bold">{t('Faits')}</dt><dd className="num text-2xl font-bold">{k.vaccination.done}</dd></div>
                <div className="rounded-2xl bg-[var(--bg)] px-3 py-2"><dt className="text-sm font-bold text-[var(--fg-muted)]">{t('À faire')}</dt><dd className="num text-2xl font-bold">{k.vaccination.toDo}</dd></div>
                {k.vaccination.overdue > 0 && (
                  <div className="rounded-2xl bg-[var(--color-ocre-100)] px-3 py-2 text-[var(--color-ocre-700)]"><dt className="text-sm font-bold">{t('En retard')}</dt><dd className="num text-2xl font-bold">{k.vaccination.overdue}</dd></div>
                )}
              </dl>
            </header>

            {b.error && <ErrorNote error={b.error} />}
            {book && (
              <>
                {book.next && (
                  <div className={`flex items-center gap-4 rounded-3xl p-4 ${book.next.status === 'en retard' ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' : 'bg-[var(--color-brand-900)] text-white'}`}>
                    <Pictogram name="vaccine" size={30} className="shrink-0" />
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider">{book.next.status === 'en retard' ? t('Vaccin en retard') : t('Prochain vaccin')}</p>
                      <p className="text-xl font-bold">{t(book.next.name)}</p>
                      <p className="text-base">
                        {book.next.ageLabel && t(book.next.ageLabel)} · {t('prévu le {date}', { date: fmtDate(book.next.dueAt, { day: 'numeric', month: 'long', year: 'numeric' }, locale) })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                  <div className="simple-hide space-y-4">
                    <h3 className="text-lg font-bold">{t('Calendrier de vaccination')}</h3>
                    {groupByAge(book.immunizations).map((g) => (
                      <div key={g.label}>
                        <p className="label mb-2">{t(g.label)}</p>
                        <ul className="space-y-2">
                          {g.items.map((i) => {
                            const pill = PILL[i.status];
                            return (
                              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
                                <span className={`pill ${pill.cls}`}><pill.Icon size={14} aria-hidden /> {t(pill.label)}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block font-bold">{t(i.name)}</span>
                                  {i.disease && <span className="block text-sm text-[var(--fg-muted)]">{t('Protège contre : {disease}', { disease: t(i.disease) })}</span>}
                                </span>
                                <span className="text-sm text-[var(--fg-muted)]">
                                  {i.givenAt
                                    ? `${t('fait le {date}', { date: fmtDate(i.givenAt, { day: 'numeric', month: 'short', year: 'numeric' }, locale) })}${i.place ? ` · ${i.place}` : ''}`
                                    : t('prévu le {date}', { date: fmtDate(i.dueAt, { day: 'numeric', month: 'short', year: 'numeric' }, locale) })}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <aside aria-label={t('Preuve de vaccination de {name}', { name: k.firstName })} className="flex flex-col items-center gap-2 self-start rounded-3xl bg-[var(--color-brand-50)] p-4 text-center text-[var(--color-brand-950)] lg:sticky lg:top-24">
                    <p className="text-lg font-bold">{t('Preuve de vaccination')}</p>
                    <Qr value={book.proof.qrPayload} size={200} label={t('QR de preuve de vaccination de {name}', { name: k.firstName })} />
                    <p className="max-w-56 text-sm">
                      {t('Signée par Ganji : l’école ou le centre de santé la vérifie en scannant.')} <span className="num">{book.proof.given.length}</span>{' '}
                      {book.proof.given.length > 1 ? t('vaccins couverts.') : t('vaccin couvert.')}
                    </p>
                  </aside>
                </div>
              </>
            )}
          </section>
        );
      })}
    </I18nScope>
  );
}
