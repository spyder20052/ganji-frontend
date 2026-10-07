'use client';
import { useLocale, useT } from '@/i18n/client';
import { dayLabel } from './time';

/** Jour des messages qui suivent (heure du Bénin) : « Aujourd'hui », « Hier » ou la date. */
export function DaySeparator({ at }: { at: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <p className="flex justify-center py-1">
      <span className="pill bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]">{dayLabel(at, t, locale)}</span>
    </p>
  );
}
