'use client';
import { AlertTriangle, ArrowLeft, Expand, Phone, Pill, Printer, Shrink, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { QrClient } from '@/components/QrClient';
import { useLocale, useT } from '@/i18n/client';
import type { T } from '@/i18n/translate';
import { fmtDateTime, fmtPhone } from '@/lib/format';
import type { Summary } from '@/lib/types';
import { cardFromSummary, readCard, saveCard, type EmergencyCard } from '../_lib/emergency-card';

type Status = 'loading' | 'ready' | 'missing';

const PRINT_CSS = `@media print{@page{size:A4;margin:12mm}body *{visibility:hidden!important}#carte-imprimable,#carte-imprimable *{visibility:visible!important}#carte-imprimable{position:absolute;left:0;top:0}}`;

function spokenGroup(g: string, t: T) {
  return g.replace('+', ` ${t('positif')}`).replace('-', ` ${t('négatif')}`);
}

export function EmergencyCardView() {
  const t = useT();
  const locale = useLocale();
  const [card, setCard] = useState<EmergencyCard | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [online, setOnline] = useState(true);
  const [origin, setOrigin] = useState('');
  const [full, setFull] = useState(false);
  const [canFull, setCanFull] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanFull(!!document.fullscreenEnabled);
    const local = readCard();
    setCard(local);
    setStatus(local ? 'ready' : 'loading');
    const net = () => setOnline(navigator.onLine);
    net();
    window.addEventListener('online', net);
    window.addEventListener('offline', net);
    const fs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fs);

    // En ligne : on rafraîchit la copie locale (silencieusement si pas de session).
    let cancelled = false;
    if (navigator.onLine) {
      fetch('/api/me/summary', { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<Summary>) : null))
        .then((s) => {
          if (!s || cancelled) return;
          const fresh = cardFromSummary(s);
          saveCard(fresh);
          setCard(fresh);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setStatus((cur) => (cur === 'loading' ? (readCard() ? 'ready' : 'missing') : cur));
        });
    } else if (!local) {
      setStatus('missing');
    }
    return () => {
      cancelled = true;
      window.removeEventListener('online', net);
      window.removeEventListener('offline', net);
      document.removeEventListener('fullscreenchange', fs);
    };
  }, []);

  useEffect(() => {
    if (card && status === 'loading') setStatus('ready');
  }, [card, status]);

  async function toggleFull() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* plein écran refusé : la page reste lisible */
    }
  }

  const qrValue = card?.qrToken && origin ? `${origin}/urgence/${card.qrToken}` : null;
  const name = card ? `${card.firstName} ${card.lastNameInitial}.` : '';
  const listen = card
    ? [
        t("Carte d'urgence de {prenom}, {age} ans.", { prenom: card.firstName, age: card.age }),
        card.bloodGroup ? t('Groupe sanguin {group}.', { group: spokenGroup(card.bloodGroup, t) }) : t('Groupe sanguin inconnu.'),
        card.allergies.length ? t('Allergies : {list}.', { list: card.allergies.join(', ') }) : t('Aucune allergie connue.'),
        card.treatments ? t('Traitement en cours : {treatment}.', { treatment: card.treatments }) : '',
        card.emergencyContact
          ? card.emergencyContact.phone
            ? t('Personne à prévenir : {name}, au {phone}.', { name: card.emergencyContact.name, phone: card.emergencyContact.phone.split('').join(' ') })
            : t('Personne à prévenir : {name}.', { name: card.emergencyContact.name })
          : '',
      ].join(' ')
    : '';

  return (
    <main id="contenu" className="mx-auto min-h-dvh max-w-3xl space-y-5 px-4 py-4">
      <style>{PRINT_CSS}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/app" className="btn btn-ghost !min-h-12">
          <ArrowLeft size={20} aria-hidden /> {t('Retour')}
        </Link>
        <div className="flex flex-wrap items-center gap-2" role="status">
          <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">{t('Disponible sans réseau')}</span>
          {!online && (
            <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
              <WifiOff size={16} aria-hidden /> {t('Hors ligne')}
            </span>
          )}
        </div>
      </div>

      {status === 'loading' && !card && (
        <p role="status" className="card p-6 text-lg">{t('Chargement de votre carte…')}</p>
      )}

      {status === 'missing' && !card && (
        <div className="card space-y-4 p-6" role="status">
          <h1 className="text-2xl font-bold">{t('Carte d’urgence pas encore enregistrée sur ce téléphone')}</h1>
          <p>{t('Ouvrez une fois votre espace Ganji avec du réseau : la carte sera alors gardée sur le téléphone et marchera ensuite sans réseau.')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/connexion" className="btn btn-primary">{t('Ouvrir mon carnet')}</Link>
            <a href="tel:118" className="btn btn-danger"><Phone size={20} aria-hidden /> {t('Appeler le 118')}</a>
          </div>
        </div>
      )}

      {card && (
        <>
          <article aria-labelledby="h-carte" className="card overflow-hidden !border-2 !border-[var(--color-danger-600)] print:hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 bg-[var(--color-danger-600)] px-5 py-4 text-white">
              <p className="text-sm font-bold tracking-widest uppercase">Carte d’urgence<En>Emergency card</En></p>
              <h1 id="h-carte" className="text-2xl font-bold sm:text-3xl">
                {name} <span className="font-normal">· {t('{age} ans', { age: card.age })}</span>
              </h1>
            </header>

            <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex flex-col items-center rounded-3xl bg-[var(--color-danger-50)] px-8 py-4 text-[var(--color-danger-800)]">
                <p className="text-base font-bold">Groupe sanguin<En>Blood group</En></p>
                <p className="num text-[7rem] leading-none font-bold">{card.bloodGroup ?? '?'}</p>
              </div>
              <dl className="space-y-4">
                <div>
                  <dt className="label flex items-center gap-2"><AlertTriangle size={16} aria-hidden /> {t('Allergies')}</dt>
                  <dd className="text-3xl font-bold">{card.allergies.length ? card.allergies.join(', ') : t('Aucune connue')}</dd>
                </div>
                <div>
                  <dt className="label flex items-center gap-2"><Pill size={16} aria-hidden /> <span>Traitement en cours<En>Current treatment</En></span></dt>
                  <dd className="text-2xl font-bold">{card.treatments ?? t('Aucun renseigné')}</dd>
                </div>
              </dl>
            </div>

            {card.emergencyContact && (
              <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[var(--bg)] p-4">
                <div>
                  <p className="label">Personne à prévenir<En>Emergency contact</En></p>
                  <p className="text-2xl font-bold">{card.emergencyContact.name}</p>
                </div>
                {card.emergencyContact.phone && (
                  <a href={`tel:${card.emergencyContact.phone}`} className="btn btn-danger !min-h-14 text-xl">
                    <Phone size={22} aria-hidden /> <span className="num">{fmtPhone(card.emergencyContact.phone)}</span>
                  </a>
                )}
              </div>
            )}

            {qrValue && (
              <div className="flex flex-col items-center gap-3 border-t border-[var(--border)] p-5 text-center">
                <p className="text-2xl font-bold">Secouriste : scannez ce code<span lang="en" className="block text-lg font-normal">Rescuer: scan this code</span></p>
                <QrClient value={qrValue} size={260} label={t('QR de la carte d’urgence, à scanner par les secours')} />
                <p className="max-w-md text-base text-[var(--fg-muted)]">
                  {t('Le QR ouvre la fiche d’urgence (sans maladie ni détail privé). Chaque lecture est enregistrée et le titulaire est prévenu.')}
                </p>
              </div>
            )}
          </article>

          <div className="flex flex-wrap gap-3 print:hidden">
            <ListenButton text={listen} audioKey="app.carte-urgence" />
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={20} aria-hidden /> {t('Imprimer ma carte')}
            </button>
            {canFull && (
              <button type="button" className="btn btn-ghost" onClick={() => void toggleFull()} aria-pressed={full}>
                {full ? <Shrink size={20} aria-hidden /> : <Expand size={20} aria-hidden />} {full ? t('Quitter le plein écran') : t('Plein écran')}
              </button>
            )}
            <a href="tel:118" className="btn btn-danger"><Phone size={20} aria-hidden /> {t('Pompiers 118')}</a>
          </div>
          <p className="text-base text-[var(--fg-muted)] print:hidden">
            {t('Copie enregistrée sur ce téléphone le {date}. Imprimée au format carte bancaire, elle se glisse dans un portefeuille : utile aussi sans téléphone.', { date: fmtDateTime(card.savedAt, locale) })}
          </p>

          {/* Format portefeuille (85,6 × 54 mm), visible uniquement à l'impression */}
          <div
            id="carte-imprimable"
            aria-hidden
            className="hidden h-[54mm] w-[85.6mm] overflow-hidden rounded-[3mm] border border-black bg-white text-black [print-color-adjust:exact] print:flex"
          >
            <div className="flex min-w-0 flex-1 flex-col justify-between p-[3mm]">
              <div>
                <p className="text-[6pt] font-bold tracking-widest text-[#c62828] uppercase">Carte d’urgence · <span lang="en">Emergency card</span></p>
                <p className="text-[10pt] leading-tight font-bold">{name} · {t('{age} ans', { age: card.age })}</p>
              </div>
              <p className="text-[22pt] leading-none font-bold text-[#c62828]">{card.bloodGroup ?? '?'}</p>
              <div className="space-y-[0.6mm] text-[6.5pt] leading-tight">
                <p><b>{t('Allergies :')}</b> {card.allergies.length ? card.allergies.join(', ') : t('aucune connue')}</p>
                {card.treatments && <p className="line-clamp-2"><b>Traitement · <span lang="en">Treatment</span> :</b> {card.treatments}</p>}
                {card.emergencyContact && <p><b>Prévenir · <span lang="en">Contact</span> :</b> {card.emergencyContact.name} {card.emergencyContact.phone ? fmtPhone(card.emergencyContact.phone) : ''}</p>}
                <p>{t('Urgence : pompiers 118')}</p>
              </div>
            </div>
            {qrValue && (
              <div className="flex w-[32mm] shrink-0 flex-col items-center justify-center gap-[1mm] border-l border-dashed border-black/40 p-[2mm]">
                <QrClient value={qrValue} size={110} label={t('QR de la carte d’urgence')} />
                <p className="text-center text-[5.5pt] leading-tight font-bold">Secouriste : scannez<br /><span lang="en">Rescuer: scan</span></p>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

/** Étiquette anglaise à côté du français : la carte sert aussi aux secours étrangers et à la diaspora. */
function En({ children }: { children: React.ReactNode }) {
  return (
    <span lang="en" className="font-normal">
      {' · '}
      {children}
    </span>
  );
}
