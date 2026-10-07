import type { Locale, T } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';

/** Jour d'un horodatage à l'heure du Bénin (Africa/Porto-Novo) : sert à regrouper les messages par jour. */
export function dayKey(d: string | Date) {
  return fmtDate(d, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'fr');
}

/** Séparateur de jour d'une conversation : « Aujourd'hui », « Hier » ou « jeudi 24 septembre ». */
export function dayLabel(d: string | Date, t: T, locale: Locale, now = new Date()) {
  const k = dayKey(d);
  if (k === dayKey(now)) return t('Aujourd’hui');
  if (k === dayKey(new Date(now.getTime() - 86_400_000))) return t('Hier');
  return fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }, locale);
}

/** Indices des messages qui ouvrent un nouveau jour (le premier compris). */
export function dayStarts(items: { at: string }[]) {
  const starts = new Set<number>();
  items.forEach((m, i) => {
    if (i === 0 || dayKey(m.at) !== dayKey(items[i - 1].at)) starts.add(i);
  });
  return starts;
}
