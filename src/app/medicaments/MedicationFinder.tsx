'use client';
import { ArrowLeft, Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { LocateControl } from '@/components/LocateControl';
import { Pictogram } from '@/components/Pictogram';
import { PlaceList } from '@/components/PlaceList';
import { useLocale, useT } from '@/i18n/client';
import { api } from '@/lib/api';
import { fcfa, relative } from '@/lib/format';
import { fmtKm, type Place } from '@/lib/places';
import { useGeolocation } from '@/lib/use-geolocation';

interface MedResult {
  id: string;
  dci: string;
  form: string;
  strength: string;
  category: string | null;
  atc: string | null;
  chronic: boolean;
  indicativePriceFcfa: number | null;
  pharmaciesInStock: number;
  minPriceFcfa: number | null;
}

type PharmacyStock = Place & { priceFcfa: number | null; availability: 'disponible' | 'stock faible'; updatedAt: string };

interface Availability {
  medication: { id: string; dci: string; form: string; strength: string };
  pharmacies: PharmacyStock[];
}

const SUGGESTIONS = ['Paracétamol', 'Amoxicilline', 'Artéméther', 'SRO', 'Metformine', 'Hydroxyurée'];

export function MedicationFinder() {
  const t = useT();
  const locale = useLocale();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MedResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [med, setMed] = useState<MedResult | null>(null);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [onDuty, setOnDuty] = useState<Place[] | null>(null);
  const geo = useGeolocation({ autoIfGranted: true });
  const inputRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLHeadingElement>(null);

  // Recherche avec délai de 300 ms ; la requête précédente est annulée.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      api<MedResult[]>(`/medications/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then(setResults)
        .catch((e: unknown) => {
          if ((e as { name?: string }).name !== 'AbortError') setSearchError('Recherche impossible pour le moment (réseau).');
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const posQuery = geo.pos ? `?lat=${geo.pos.lat}&lng=${geo.pos.lng}` : '';

  useEffect(() => {
    if (!med) {
      setAvail(null);
      return;
    }
    let alive = true;
    setAvailLoading(true);
    api<Availability>(`/medications/${med.id}/pharmacies${posQuery}`)
      .then((r) => alive && setAvail(r))
      .catch(() => alive && setAvail({ medication: med, pharmacies: [] }))
      .finally(() => alive && setAvailLoading(false));
    return () => {
      alive = false;
    };
  }, [med, posQuery]);

  useEffect(() => {
    let alive = true;
    api<Place[]>(`/pharmacies/on-duty${posQuery}`)
      .then((r) => alive && setOnDuty(r))
      .catch(() => alive && setOnDuty([]));
    return () => {
      alive = false;
    };
  }, [posQuery]);

  useEffect(() => {
    if (med) detailRef.current?.focus();
  }, [med]);

  const from = geo.source === 'gps' ? geo.pos : null;

  return (
    <div className="space-y-6">
      {!med && (
        <section aria-labelledby="h-search" className="space-y-4">
          <h2 id="h-search" className="sr-only">{t('Rechercher')}</h2>
          <label htmlFor="med-q" className="label block">{t('Nom du médicament')}</label>
          <div className="relative">
            <Search size={22} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              ref={inputRef}
              id="med-q"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              className="input !min-h-14 !rounded-full !pl-12 !pr-12 text-lg"
              placeholder={t('Ex. paracétamol, amoxicilline…')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-describedby="med-q-hint"
            />
            {q && (
              <button
                type="button"
                className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full"
                aria-label={t('Effacer la recherche')}
                onClick={() => {
                  setQ('');
                  inputRef.current?.focus();
                }}
              >
                <X size={20} aria-hidden />
              </button>
            )}
          </div>
          <p id="med-q-hint" className="text-sm text-[var(--fg-muted)]">{t('Nom du médicament (DCI), classe ou code ATC. Les accents ne sont pas obligatoires.')}</p>

          {!q && (
            <div className="flex flex-wrap gap-2" aria-label={t('Recherches fréquentes')}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="btn btn-ghost !min-h-11 text-base" onClick={() => setQ(s)}>{s}</button>
              ))}
            </div>
          )}

          <div aria-live="polite" className="space-y-3">
            {searching && <p className="flex items-center gap-2 text-[var(--fg-muted)]"><Loader2 size={18} className="animate-spin" aria-hidden /> {t('Recherche…')}</p>}
            {searchError && <p role="alert">{t(searchError)}</p>}
            {results && !searching && results.length === 0 && (
              <p>{t('Aucun médicament trouvé pour « {q} ». Vérifiez l’orthographe ou demandez à votre pharmacien.', { q: q.trim() })}</p>
            )}
            {results && results.length > 0 && (
              <ul className="grid gap-3">
                {results.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setMed(m)} className="card flex w-full items-center gap-4 p-4 text-left hover:border-[var(--color-brand-900)]">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name="pill" size={24} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{m.dci}</span>
                        <span className="block text-base text-[var(--fg-muted)]">
                          {m.form} · {m.strength}
                          {m.category ? ` · ${m.category}` : ''}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <span className={`pill ${m.pharmaciesInStock ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'border border-[var(--border)] text-[var(--fg-muted)]'}`}>
                            {m.pharmaciesInStock
                              ? m.pharmaciesInStock > 1
                                ? t('disponible dans {n} pharmacies', { n: m.pharmaciesInStock })
                                : t('disponible dans {n} pharmacie', { n: m.pharmaciesInStock })
                              : t('aucune pharmacie ne le signale')}
                          </span>
                          {(m.minPriceFcfa ?? m.indicativePriceFcfa) != null && (
                            <span className="pill num border border-[var(--border)]">{t('à partir de {price} (prix indicatif)', { price: fcfa(m.minPriceFcfa ?? m.indicativePriceFcfa, locale) })}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {med && (
        <section aria-labelledby="h-med" className="space-y-4">
          <button type="button" className="btn btn-ghost !min-h-11 text-base" onClick={() => setMed(null)}>
            <ArrowLeft size={18} aria-hidden /> {t('Autre médicament')}
          </button>
          <div className="card flex flex-wrap items-center gap-4 p-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-900)] text-white"><Pictogram name="pill" size={28} /></span>
            <div className="min-w-0 flex-1">
              <h2 id="h-med" ref={detailRef} tabIndex={-1} className="text-2xl font-bold outline-none">{med.dci}</h2>
              <p className="text-[var(--fg-muted)]">{med.form} · {med.strength}</p>
            </div>
            {avail && (
              <ListenButton
                text={
                  avail.pharmacies.length
                    ? t('{med} : disponible dans {n} pharmacies. {first}.', {
                        med: `${med.dci} ${med.strength}`,
                        n: avail.pharmacies.length,
                        first: [
                          avail.pharmacies[0].name,
                          avail.pharmacies[0].onDuty ? t('de garde') : null,
                          avail.pharmacies[0].distanceKm != null ? t('à {distance}', { distance: fmtKm(avail.pharmacies[0].distanceKm) }) : null,
                        ]
                          .filter(Boolean)
                          .join(', '),
                      })
                    : t('{med} : aucune pharmacie ne le signale en stock pour le moment.', { med: med.dci })
                }
                audioKey="meds.result"
              />
            )}
          </div>

          <div className="card space-y-2 p-4">
            <p className="font-bold">{t('Trier par distance')}</p>
            <LocateControl idPrefix="med" status={geo.status} source={geo.source} onLocate={geo.request} onCommune={(p) => geo.setManual(p)} compact />
          </div>

          <h3 className="text-xl font-bold">{t('Pharmacies qui l’ont')} <span className="text-base font-normal text-[var(--fg-muted)]">{t('(de garde d’abord)')}</span></h3>
          {availLoading && <p className="flex items-center gap-2 text-[var(--fg-muted)]" role="status"><Loader2 size={18} className="animate-spin" aria-hidden /> {t('Recherche des stocks…')}</p>}
          {avail && !availLoading && (
            <PlaceList
              places={avail.pharmacies}
              from={from}
              empty={t('Aucune pharmacie ne signale ce médicament en stock. Demandez un équivalent à votre pharmacien ou à votre médecin.')}
              extra={(p) => {
                const s = p as PharmacyStock;
                return (
                  <>
                    <span className={`pill ${s.availability === 'disponible' ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'}`}>
                      {t(s.availability)}
                    </span>
                    {s.priceFcfa != null && <span className="pill num border border-[var(--border)]">{fcfa(s.priceFcfa, locale)}</span>}
                    {s.updatedAt && <span className="text-sm text-[var(--fg-muted)]">{t('stock mis à jour {when}', { when: relative(s.updatedAt, locale) })}</span>}
                  </>
                );
              }}
            />
          )}
        </section>
      )}

      <section aria-labelledby="h-duty" className="space-y-3">
        <h2 id="h-duty" className="flex items-center gap-2 text-xl font-bold"><Pictogram name="pharmacy" size={24} /> {t('Pharmacies de garde')}</h2>
        {!onDuty && <p className="text-[var(--fg-muted)]" role="status">{t('Chargement…')}</p>}
        {onDuty && <PlaceList places={onDuty.slice(0, 6)} from={from} empty={t('Aucune pharmacie de garde signalée pour le moment.')} />}
        {onDuty && onDuty.length > 6 && <p className="text-base text-[var(--fg-muted)]">{t('Et {n} autres : voir la', { n: onDuty.length - 6 })} <Link className="underline" href="/carte">{t('carte des lieux de soin')}</Link>.</p>}
      </section>
    </div>
  );
}
