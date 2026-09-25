'use client';
import { ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type KeyboardEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { ROLE_HOME, type Me } from '@/lib/types';
import { IllustrationView } from './IllustrationView';

export interface PersonaView {
  key: string;
  /** Compte de démonstration ouvert par « Essayer comme… ». */
  persona: string;
  name: string;
  role: string;
  need: string;
  benefits: string[];
}

/** Un profil par onglet. `available` : portraits déjà déposés dans public/illustrations. */
export function PersonaTabs({ personas, available }: { personas: PersonaView[]; available: Record<string, boolean> }) {
  const router = useRouter();
  const [current, setCurrent] = useState(personas[0].key);
  // Portrait du panneau : différé comme les autres illustrations, jusqu'au premier changement d'onglet.
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const p = personas.find((x) => x.key === current) ?? personas[0];
  const select = (key: string) => {
    setCurrent(key);
    setTouched(true);
  };

  // Onglets au clavier : flèches gauche et droite, Début, Fin (motif ARIA « tabs »).
  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = personas.length - 1;
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (next === null) return;
    e.preventDefault();
    select(personas[next].key);
    tabs.current[next]?.focus();
  }

  async function tryAs() {
    setBusy(true);
    setError(null);
    try {
      const me = await api<Me>(`/auth/demo/${p.persona}`, { method: 'POST' });
      router.push(ROLE_HOME[me.role]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connexion impossible. Réessayez.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Profils" className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {personas.map((x, i) => {
          const on = x.key === current;
          return (
            <button
              key={x.key}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${x.key}`}
              aria-selected={on}
              aria-controls="panel-persona"
              tabIndex={on ? 0 : -1}
              onClick={() => select(x.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex shrink-0 snap-start items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 transition-colors ${on ? 'bg-brand-900 text-white' : 'bg-card hover:bg-brand-100'}`}
            >
              <span className="block h-10 w-10 overflow-hidden rounded-full bg-brand-100">
                <IllustrationView
                  name={`persona-${x.key}`}
                  frame="aspect-square origin-[50%_28%] scale-[1.8]"
                  alt=""
                  sizes="72px"
                  defer
                  available={available[x.key]}
                  fallbackIcon={<span className="text-xs font-semibold">{x.name.replace('Dr ', '').replace('La ', '').replace('Le ', '')[0]}</span>}
                />
              </span>
              <span className="text-base font-semibold whitespace-nowrap">{x.name}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="panel-persona" aria-labelledby={`tab-${p.key}`} className="grid gap-6 rounded-card bg-card p-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:items-center md:gap-10 md:p-8">
        <div className="overflow-hidden rounded-[8%]">
          <IllustrationView
            name={`persona-${p.key}`}
            frame="aspect-square"
            alt={`Portrait : ${p.name}, ${p.role}`}
            sizes="(min-width: 768px) 40vw, 90vw"
            defer={!touched}
            available={available[p.key]}
            fallbackIcon={<span className="font-display text-3xl font-medium">{p.name.replace('Dr ', '').replace('La ', '').replace('Le ', '')[0]}</span>}
          />
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-base text-fg-muted">{p.role}</p>
            <h3 className="text-3xl font-medium">{p.name}</h3>
          </div>
          <p className="font-display text-xl leading-snug">{p.need}</p>
          <ul className="space-y-3">
            {p.benefits.map((b) => (
              <li key={b} className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-leaf text-brand-900">
                  <Check size={16} aria-hidden />
                </span>
                <span className="text-lg">{b}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void tryAs()} disabled={busy} className="btn btn-primary">
            {busy ? 'Connexion…' : `Essayer comme ${p.name}`} <ArrowRight size={18} aria-hidden />
          </button>
          {error && (
            <p role="alert" className="rounded-2xl bg-ocre-100 p-3 text-base font-semibold text-ocre-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
