const TZ = 'Africa/Porto-Novo';

export function fmtDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Date(d).toLocaleDateString('fr-FR', { timeZone: TZ, ...opts });
}
export function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString('fr-FR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}
export function relative(d: string | Date) {
  const diff = (new Date(d).getTime() - Date.now()) / 60_000;
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'minute');
  if (abs < 60 * 24) return rtf.format(Math.round(diff / 60), 'hour');
  return rtf.format(Math.round(diff / 1440), 'day');
}
export function fcfa(n: number | null | undefined) {
  return n == null ? '—' : `${n.toLocaleString('fr-FR')} FCFA`;
}
/** « 0190000002 » → « 01 90 00 00 02 » (lisible et dictable). */
export function fmtPhone(p: string) {
  const intl = p.startsWith('+229') ? '+229 ' : '';
  const rest = p.replace(/^\+229/, '');
  // Les numéros courts (118, 117) restent d'un seul tenant.
  return /^\d{8,}$/.test(rest) ? intl + rest.replace(/(\d{2})(?=\d)/g, '$1 ') : p;
}
