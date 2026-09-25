'use client';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { api } from '@/lib/api';
import { relative } from '@/lib/format';

interface Notif { id: string; kind: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string }

/**
 * Cloche de l'en-tête : ce qui vous arrive (rendez-vous confirmé, donneur trouvé, commande en route,
 * réponse de l'écoutant…). Le nombre de non lues se met à jour toutes les minutes et au retour sur l'onglet.
 */
export function NotificationBell() {
  const t = useT();
  const locale = useLocale();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notif[] | null>(null);
  const ref = useRef<HTMLDetailsElement>(null);

  const count = useCallback(() => api<{ unread: number }>('/me/notifications/count').then((r) => setUnread(r.unread)).catch(() => undefined), []);
  useEffect(() => {
    count();
    const id = setInterval(count, 60_000);
    const onFocus = () => document.visibilityState === 'visible' && count();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [count]);

  async function open() {
    setItems(await api<Notif[]>('/me/notifications').catch(() => []));
  }
  async function readAll() {
    await api('/me/notifications/read', { method: 'POST', json: {} }).catch(() => undefined);
    setUnread(0);
    setItems((l) => l?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
  }
  async function readOne(n: Notif) {
    if (!n.readAt) await api('/me/notifications/read', { method: 'POST', json: { id: n.id } }).catch(() => undefined);
    ref.current?.removeAttribute('open');
    count();
  }

  const label = unread ? t('Notifications, {n} non lues', { n: unread }) : t('Notifications');
  return (
    <details ref={ref} className="relative" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && open()}>
      <summary className="chip-round relative cursor-pointer list-none" aria-label={label} title={label}>
        <Bell size={20} aria-hidden />
        {unread > 0 && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-danger-600)] px-1 text-xs font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </summary>
      <div className="card absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] p-2 text-[var(--fg)] shadow-lg">
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <p className="font-display text-lg font-semibold">{t('Notifications')}</p>
          {unread > 0 && (
            <button type="button" onClick={readAll} className="rounded-full px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)] dark:text-[var(--color-leaf)]">
              {t('Tout marquer comme lu')}
            </button>
          )}
        </div>
        {items === null ? (
          <p className="px-2 py-3 text-base text-[var(--fg-muted)]">{t('Chargement…')}</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-3 text-base text-[var(--fg-muted)]">{t('Rien de nouveau pour le moment.')}</p>
        ) : (
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {items.map((n) => {
              const body = (
                <>
                  <span className="flex items-start gap-2">
                    {!n.readAt && <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-500)]" />}
                    <span className="min-w-0">
                      <span className="block font-semibold">{n.title}</span>
                      <span className="block text-base text-[var(--fg-muted)]">{n.body}</span>
                      <span className="block text-sm text-[var(--fg-muted)]">{relative(n.createdAt, locale)}</span>
                    </span>
                  </span>
                  {!n.readAt && <span className="sr-only">{t('Non lue')}</span>}
                </>
              );
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link prefetch={false} href={n.href} onClick={() => readOne(n)} className="block rounded-2xl px-2 py-2 hover:bg-[var(--bg)]">
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => readOne(n)} className="block w-full rounded-2xl px-2 py-2 text-left hover:bg-[var(--bg)]">
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
