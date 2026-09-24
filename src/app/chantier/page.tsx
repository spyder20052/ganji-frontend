import type { Metadata } from 'next';
import { Check, ExternalLink } from 'lucide-react';
import progress from '../../../docs/progress.json';
import { TopBar } from '@/components/TopBar';

export const dynamic = 'force-static';
export const metadata: Metadata = {
  title: 'Suivi du chantier',
  description: 'Avancement de chaque module d’Alafia, critères d’acceptation, commits et blocages.',
};

type Status = 'done' | 'doing' | 'blocked' | 'todo';

interface Progress {
  project: string;
  updatedAt: string;
  deadline: string;
  links: Record<string, string | null>;
  blockers: { id: string; title: string; detail: string; owner: string; open: boolean }[];
  chantiers: {
    id: string;
    title: string;
    modules: string[];
    window: string;
    status: Status;
    repos: string[];
    acceptance: string;
    items: { label: string; done: boolean }[];
    commits: { sha: string; repo: string; message: string }[];
  }[];
  acceptance: { label: string; done: boolean }[];
  log: { at: string; text: string }[];
}

const data = progress as unknown as Progress;

const TZ = 'Africa/Porto-Novo';
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const hm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

const STATUS: Record<Status, { label: string; cls: string }> = {
  done: { label: 'Terminé', cls: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' },
  doing: { label: 'En cours', cls: 'bg-[var(--color-brand-900)] text-white' },
  blocked: { label: 'Bloqué', cls: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' },
  todo: { label: 'À faire', cls: 'border border-[var(--border)] text-[var(--fg-muted)]' },
};

const LINKS: [string, string][] = [
  ['frontendRepo', 'Dépôt GitHub : frontend'],
  ['backendRepo', 'Dépôt GitHub : backend'],
  ['app', 'Application déployée'],
  ['apiDocs', 'Documentation de l’API'],
];

function Checklist({ items }: { items: { label: string; done: boolean }[] }) {
  return (
    <ul className="grid gap-1.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[22px_1fr] items-start gap-2 text-base">
          <span
            aria-hidden
            className={`mt-1 grid h-5 w-5 place-items-center rounded-md border-2 ${i.done ? 'border-[var(--color-brand-900)] bg-[var(--color-brand-900)] text-white' : 'border-[var(--border)]'}`}
          >
            {i.done && <Check size={13} strokeWidth={3} />}
          </span>
          <span className={i.done ? 'text-[var(--fg-muted)] line-through decoration-[var(--fg-muted)]/60' : ''}>
            <span className="sr-only">{i.done ? 'Fait : ' : 'À faire : '}</span>
            {i.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ChantierPage() {
  const ch = data.chantiers;
  const allItems = ch.flatMap((c) => c.items);
  const doneItems = allItems.filter((i) => i.done).length;
  const pct = allItems.length ? Math.round((100 * doneItems) / allItems.length) : 0;
  const commits = ch.reduce((n, c) => n + c.commits.length, 0);
  const current = ch.find((c) => c.status === 'doing') ?? ch.find((c) => c.status === 'blocked') ?? ch.find((c) => c.status === 'todo');
  const openBlockers = data.blockers.filter((b) => b.open).length;
  const acDone = data.acceptance.filter((a) => a.done).length;

  return (
    <>
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-6">
        <header className="card grid items-end gap-6 !border-0 bg-[var(--color-brand-900)] p-6 text-white sm:p-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="label !text-[var(--color-brand-200)]">Test technique MTDI · e-Santé</p>
            <h1 className="mt-2 text-4xl font-bold">Chantier {data.project}</h1>
            <p className="mt-2 max-w-xl text-[var(--color-brand-100)]">
              {current ? `${STATUS[current.status].label} : ${current.id} ${current.title}. Livraison visée à ${hm(data.deadline)}.` : 'Tous les chantiers sont terminés.'}
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement global">
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div>
            <p className="num text-7xl font-bold leading-none sm:text-8xl">{pct}%</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                [`${ch.filter((c) => c.status === 'done').length}/${ch.length}`, 'chantiers finis'],
                [`${doneItems}/${allItems.length}`, 'tâches faites'],
                [String(commits), 'commits develop'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/10 px-3 py-2.5">
                  <p className="num text-2xl font-bold leading-tight">{v}</p>
                  <p className="text-sm text-[var(--color-brand-100)]">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="h-ch" className="card space-y-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="h-ch" className="text-xl font-bold">Chantiers</h2>
              <p className="flex flex-wrap gap-1.5 text-sm">
                {(Object.keys(STATUS) as Status[]).map((s) => (
                  <span key={s} className={`pill ${STATUS[s].cls}`}>{STATUS[s].label} <span className="num">{ch.filter((c) => c.status === s).length}</span></span>
                ))}
              </p>
            </div>
            <div className="grid gap-2.5">
              {ch.map((c) => {
                const d = c.items.filter((i) => i.done).length;
                const p = c.items.length ? Math.round((100 * d) / c.items.length) : 0;
                return (
                  <details key={c.id} id={c.id} open={c === current} className="group rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] open:border-[var(--color-brand-500)]/50">
                    <summary className="grid cursor-pointer list-none grid-cols-[48px_minmax(0,1fr)] items-center gap-3 p-3.5 sm:grid-cols-[56px_minmax(0,1fr)_auto] [&::-webkit-details-marker]:hidden">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-lg font-bold text-[var(--color-brand-900)] sm:h-14 sm:w-14">{c.id}</span>
                      <span className="grid min-w-0 gap-1">
                        <span className="text-lg font-bold leading-tight">{c.title}</span>
                        <span className="flex flex-wrap items-center gap-2 text-sm text-[var(--fg-muted)]">
                          {c.modules.map((m) => (
                            <span key={m} className="rounded-md border border-[var(--border)] px-1.5 font-mono text-xs text-[var(--fg)]">{m}</span>
                          ))}
                          <span>{c.window}</span>
                          <span>· {c.repos.join(' + ')}</span>
                        </span>
                      </span>
                      <span className="col-start-2 flex items-center gap-3 sm:col-start-auto sm:grid sm:justify-items-end sm:gap-2">
                        <span className={`pill whitespace-nowrap ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--border)]" title={`${d}/${c.items.length}`} aria-label={`${d} tâches sur ${c.items.length}`}>
                          <span className="block h-full bg-[var(--color-brand-900)] dark:bg-[var(--color-brand-200)]" style={{ width: `${p}%` }} />
                        </span>
                      </span>
                    </summary>
                    <div className="grid gap-3.5 px-4 pb-4 sm:pl-[86px]">
                      <Checklist items={c.items} />
                      <p className="rounded-xl bg-[var(--color-ocre-100)] px-3 py-2.5 text-base text-[var(--color-ink)]">
                        <strong className="text-[var(--color-ocre-700)]">Critère d’acceptation.</strong> {c.acceptance}
                      </p>
                      {c.commits.length > 0 && (
                        <div className="grid gap-1">
                          <p className="label">Commits sur develop</p>
                          {c.commits.map((k) => (
                            <p key={`${k.repo}-${k.sha}`} className="flex flex-wrap items-baseline gap-2.5 text-base">
                              <code className="font-mono text-sm text-[var(--color-brand-500)]">{k.sha}</code>
                              <span className="font-mono text-sm text-[var(--fg-muted)]">{k.repo}</span>
                              <span>{k.message}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>

          <aside className="grid gap-5">
            <section aria-labelledby="h-bl" className="card space-y-3 p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="h-bl" className="text-xl font-bold">Blocages</h2>
                <span className="num text-sm text-[var(--fg-muted)]">{openBlockers ? `${openBlockers} ouvert${openBlockers > 1 ? 's' : ''}` : 'aucun'}</span>
              </div>
              {data.blockers.map((b) => (
                <div key={b.id} className={`grid gap-1 rounded-2xl p-3.5 ${b.open ? 'bg-[var(--color-ocre-100)] text-[var(--color-ink)]' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-950)]'}`}>
                  <h3 className={`font-bold ${b.open ? 'text-[var(--color-ocre-700)]' : 'line-through'}`}>{b.title}</h3>
                  <p className="text-sm">{b.detail}</p>
                  <p className="text-xs opacity-75">Action : {b.owner}</p>
                </div>
              ))}
            </section>

            <section aria-labelledby="h-li" className="card space-y-3 p-5">
              <h2 id="h-li" className="text-xl font-bold">Liens à transmettre</h2>
              {LINKS.map(([key, label]) => {
                const v = data.links[key];
                return (
                  <div key={key} className="rounded-2xl border border-[var(--border)] px-3 py-2.5">
                    <p className="text-xs text-[var(--fg-muted)]">{label}</p>
                    {v ? (
                      <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-mono text-sm text-[var(--color-brand-500)] underline-offset-2 hover:underline">
                        {v} <ExternalLink size={12} aria-hidden />
                      </a>
                    ) : (
                      <p className="font-mono text-sm text-[var(--fg-muted)]">[Lien] en attente</p>
                    )}
                  </div>
                );
              })}
            </section>

            <section aria-labelledby="h-ac" className="card space-y-3 p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="h-ac" className="text-xl font-bold">Critères d’acceptation</h2>
                <span className="num text-sm text-[var(--fg-muted)]">{acDone}/{data.acceptance.length}</span>
              </div>
              <Checklist items={data.acceptance} />
            </section>

            <section aria-labelledby="h-lg" className="card space-y-3 p-5">
              <h2 id="h-lg" className="text-xl font-bold">Journal</h2>
              <ol className="grid gap-2.5 border-l-2 border-[var(--border)] pl-3.5">
                {[...data.log].reverse().map((l) => (
                  <li key={`${l.at}-${l.text.slice(0, 20)}`} className="grid gap-0.5 text-base">
                    <time dateTime={l.at} className="font-mono text-xs text-[var(--fg-muted)]">{fmt(l.at)}</time>
                    <span>{l.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>

        <p className="text-sm text-[var(--fg-muted)]">
          Mis à jour le {fmt(data.updatedAt)}. Source : <code className="font-mono">docs/progress.json</code> du dépôt frontend (page générée au déploiement).
        </p>
      </main>
    </>
  );
}
