import { INTL, type Locale } from '@/i18n/translate';

const TZ = 'Africa/Porto-Novo';

export function fmtDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }, locale: Locale = 'fr') {
  return new Date(d).toLocaleDateString(INTL[locale], { timeZone: TZ, ...opts });
}
export function fmtDateTime(d: string | Date, locale: Locale = 'fr') {
  return new Date(d).toLocaleString(INTL[locale], { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function fmtTime(d: string | Date, locale: Locale = 'fr') {
  return new Date(d).toLocaleTimeString(INTL[locale], { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}
export function relative(d: string | Date, locale: Locale = 'fr') {
  const diff = (new Date(d).getTime() - Date.now()) / 60_000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'minute');
  if (abs < 60 * 24) return rtf.format(Math.round(diff / 60), 'hour');
  return rtf.format(Math.round(diff / 1440), 'day');
}
export function fcfa(n: number | null | undefined, locale: Locale = 'fr') {
  return n == null ? '—' : `${n.toLocaleString(INTL[locale])} FCFA`;
}
/** « 0190000002 » → « 01 90 00 00 02 » (lisible et dictable). */
export function fmtPhone(p: string) {
  const intl = p.startsWith('+229') ? '+229 ' : '';
  const rest = p.replace(/^\+229/, '');
  // Les numéros courts (118, 117) restent d'un seul tenant.
  return /^\d{8,}$/.test(rest) ? intl + rest.replace(/(\d{2})(?=\d)/g, '$1 ') : p;
}
