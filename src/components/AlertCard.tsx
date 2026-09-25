'use client';
import { Bot, Globe2, MapPin } from 'lucide-react';
import { useLocale, useT } from '@/i18n/client';
import { ALERT_KIND, SEVERITY, type HealthAlert } from '@/lib/alerts';
import { relative } from '@/lib/format';
import { ListenButton } from './ListenButton';
import { Pictogram } from './Pictogram';

/** Carte d'alerte sanitaire : gravité, portée (nationale ou locale), écoute. */
export function AlertCard({ alert, fresh = false, listen = true }: { alert: HealthAlert; fresh?: boolean; listen?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const sev = SEVERITY[alert.severity] ?? SEVERITY.INFO;
  const kind = ALERT_KIND[alert.kind] ?? { label: alert.kind, icon: 'warning' };
  return (
    <article
      className={`card space-y-3 border-l-8 p-5 ${sev.border} ${alert.auto ? '!bg-[var(--color-ocre-100)]/40' : ''} ${fresh ? 'ring-4 ring-[var(--color-ocre-500)]/50' : ''}`}
      aria-labelledby={`al-${alert.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`pill ${sev.pill}`}>{t(sev.label)}</span>
        <span className="pill border border-[var(--border)]"><Pictogram name={kind.icon} size={14} /> {t(kind.label)}</span>
        {alert.national ? (
          <span className="pill border border-[var(--border)]"><Globe2 size={14} aria-hidden /> {t('National')}</span>
        ) : (
          <span className="pill border border-[var(--border)]"><MapPin size={14} aria-hidden /> {alert.communes.join(', ')}</span>
        )}
        {alert.auto && <span className="pill bg-[var(--color-ocre-500)] text-[var(--color-ink)]"><Bot size={14} aria-hidden /> {t('Détection automatique')}</span>}
        {fresh && <span className="pill bg-[var(--color-brand-900)] text-white">{t('Nouveau')}</span>}
      </div>
      <h3 id={`al-${alert.id}`} className="text-xl font-bold">{alert.title}</h3>
      <p>{alert.message}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--fg-muted)]">{alert.source} · {relative(alert.createdAt, locale)}</p>
        {listen && <ListenButton text={`${t(sev.label)}. ${alert.title}. ${alert.message}`} audioKey={alert.audioKey ?? undefined} />}
      </div>
    </article>
  );
}
