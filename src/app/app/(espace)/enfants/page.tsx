import type { Metadata } from 'next';
import { Check, Clock, AlertTriangle } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { Qr } from '@/components/Qr';
import { fmtDate } from '@/lib/format';
import { Empty, ErrorNote, PageHead } from '../../_components/ui';
import { load } from '../../_lib/load';

export const metadata: Metadata = { title: 'Mes enfants' };

interface Child { id: string; firstName: string; lastName: string; birthDate: string; sex: string; age: string; vaccination: { done: number; toDo: number; overdue: number } }
type VaxStatus = 'fait' | 'à faire' | 'en retard';
interface Imm { id: string; code: string; name: string; dose: number; disease: string | null; ageLabel: string | null; dueAt: string; givenAt: string | null; lot: string | null; place: string | null; status: VaxStatus }
interface ImmBook { child: Child; immunizations: Imm[]; next: Imm | null; proof: { qrPayload: string; given: string[]; issuedAt: string } }

const PILL: Record<VaxStatus, { cls: string; label: string; Icon: typeof Check }> = {
  fait: { cls: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', label: 'Fait', Icon: Check },
  'à faire': { cls: 'bg-[var(--bg)] text-[var(--fg)] ring-1 ring-[var(--border)]', label: 'À faire', Icon: Clock },
  'en retard': { cls: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]', label: 'En retard', Icon: AlertTriangle },
};

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
  const res = await load<Child[]>('/maternal/children');
  const kids = res.data ?? [];
  const books = await Promise.all(kids.map((k) => load<ImmBook>(`/maternal/children/${k.id}/immunizations`)));

  const listen = kids.length
    ? kids
        .map((k, n) => {
          const b = books[n].data;
          return `${k.firstName}, ${k.age} : ${k.vaccination.done} vaccins faits${k.vaccination.overdue ? `, ${k.vaccination.overdue} en retard` : ''}.${b?.next ? ` Prochain vaccin : ${b.next.name}, le ${fmtDate(b.next.dueAt, { day: 'numeric', month: 'long' })}.` : ''}`;
        })
        .join(' ')
    : 'Aucun enfant rattaché à votre carnet.';

  return (
    <>
      <PageHead icon="baby" title={kids.length > 1 ? 'Mes enfants' : 'Mon enfant'} intro="Le carnet de vaccination suit le calendrier national (PEV). Un rappel part par SMS et par message vocal avant chaque vaccin." listen={listen} audioKey="app.enfants" />
      {res.error && <ErrorNote error={res.error} />}
      {res.data && kids.length === 0 && <Empty>Aucun enfant rattaché à votre carnet. À la naissance, la maternité crée son carnet et le relie au vôtre.</Empty>}

      {kids.map((k, n) => {
        const b = books[n];
        const book = b.data;
        return (
          <section key={k.id} aria-labelledby={`h-${k.id}`} className="card space-y-5 p-5 sm:p-6">
            <header className="flex flex-wrap items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name="baby" size={28} /></span>
              <div className="min-w-0 flex-1">
                <h2 id={`h-${k.id}`} className="text-2xl font-bold">{k.firstName}</h2>
                <p className="text-base text-[var(--fg-muted)]">{k.age} · né{k.sex === 'F' ? 'e' : ''} le {fmtDate(k.birthDate)}</p>
              </div>
              <dl className="flex gap-2 text-center">
                <div className="rounded-2xl bg-[var(--color-brand-100)] px-3 py-2 text-[var(--color-brand-900)]"><dt className="text-sm font-bold">Faits</dt><dd className="num text-2xl font-bold">{k.vaccination.done}</dd></div>
                <div className="rounded-2xl bg-[var(--bg)] px-3 py-2"><dt className="text-sm font-bold text-[var(--fg-muted)]">À faire</dt><dd className="num text-2xl font-bold">{k.vaccination.toDo}</dd></div>
                {k.vaccination.overdue > 0 && (
                  <div className="rounded-2xl bg-[var(--color-ocre-100)] px-3 py-2 text-[var(--color-ocre-700)]"><dt className="text-sm font-bold">En retard</dt><dd className="num text-2xl font-bold">{k.vaccination.overdue}</dd></div>
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
                      <p className="text-sm font-bold uppercase tracking-wider">{book.next.status === 'en retard' ? 'Vaccin en retard' : 'Prochain vaccin'}</p>
                      <p className="text-xl font-bold">{book.next.name}</p>
                      <p className="text-base">{book.next.ageLabel} · prévu le {fmtDate(book.next.dueAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                  <div className="simple-hide space-y-4">
                    <h3 className="text-lg font-bold">Calendrier de vaccination</h3>
                    {groupByAge(book.immunizations).map((g) => (
                      <div key={g.label}>
                        <p className="label mb-2">{g.label}</p>
                        <ul className="space-y-2">
                          {g.items.map((i) => {
                            const pill = PILL[i.status];
                            return (
                              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
                                <span className={`pill ${pill.cls}`}><pill.Icon size={14} aria-hidden /> {pill.label}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block font-bold">{i.name}</span>
                                  {i.disease && <span className="block text-sm text-[var(--fg-muted)]">Protège contre : {i.disease}</span>}
                                </span>
                                <span className="text-sm text-[var(--fg-muted)]">
                                  {i.givenAt ? `fait le ${fmtDate(i.givenAt, { day: 'numeric', month: 'short', year: 'numeric' })}${i.place ? ` · ${i.place}` : ''}` : `prévu le ${fmtDate(i.dueAt, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <aside aria-label={`Preuve de vaccination de ${k.firstName}`} className="flex flex-col items-center gap-2 self-start rounded-3xl bg-[var(--color-brand-50)] p-4 text-center text-[var(--color-brand-950)] lg:sticky lg:top-24">
                    <p className="text-lg font-bold">Preuve de vaccination</p>
                    <Qr value={book.proof.qrPayload} size={200} label={`QR de preuve de vaccination de ${k.firstName}`} />
                    <p className="max-w-56 text-sm">
                      Signée par Alafia : l’école ou le centre de santé la vérifie en scannant. <span className="num">{book.proof.given.length}</span> vaccin{book.proof.given.length > 1 ? 's' : ''} couvert{book.proof.given.length > 1 ? 's' : ''}.
                    </p>
                  </aside>
                </div>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}
