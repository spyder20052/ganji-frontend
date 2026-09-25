import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Eye, Phone, ShieldAlert } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { fmtPhone } from '@/lib/format';
import { tryServerApi } from '@/lib/server-api';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Carte d’urgence'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

interface EmergencyCard {
  name: string;
  firstName: string;
  lastNameInitial: string;
  age: number;
  sex: string;
  bloodGroup: string | null;
  allergies: string[];
  treatments: string | null;
  emergencyContact: { name: string | null; phone: string | null } | null;
  commune: string | null;
  notice: string;
}

const SEX: Record<string, string> = { F: 'Femme', M: 'Homme' };

/** Vue « secouriste » de la carte QR : l'essentiel vital, en très gros, sans compte. */
export default async function EmergencyCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{8,100}$/.test(token);
  const card = valid ? await tryServerApi<EmergencyCard>(`/emergency/card/${encodeURIComponent(token)}`) : null;
  const t = await getT();

  if (!card) {
    return (
      <I18nScope area="public">
        <TopBar />
        <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <h1 className="text-3xl font-bold">{t('Carte d’urgence introuvable')}</h1>
          <p className="text-lg">
            {t('Ce code ne correspond à aucune carte active : il a peut-être été renouvelé par son titulaire, ou mal lu. Réessayez de scanner le QR code imprimé.')}
          </p>
          <div className="card space-y-3 p-5">
            <p className="font-bold">{t('En attendant, soignez la personne comme un patient inconnu :')}</p>
            <a href="tel:118" className="btn btn-danger !min-h-14 text-xl"><Phone size={24} aria-hidden /> {t('Appeler le')} <span className="num">118</span></a>
            <Link href="/urgence" className="btn btn-ghost">{t('Gestes d’urgence et hôpital le plus proche')}</Link>
          </div>
        </main>
      </I18nScope>
    );
  }

  const allergies = card.allergies ?? [];
  const contactPhone = card.emergencyContact?.phone ?? null;
  const spoken = [
    t("Carte d'urgence de {name}, {age} ans.", { name: card.firstName, age: card.age }),
    card.bloodGroup ? t('Groupe sanguin {group}.', { group: card.bloodGroup }) : t('Groupe sanguin inconnu.'),
    allergies.length ? t('Allergies : {list}.', { list: allergies.join(', ') }) : t('Aucune allergie connue.'),
    card.treatments ? t('Traitement : {text}.', { text: card.treatments }) : '',
    card.emergencyContact?.name ? t('Personne à prévenir : {name}.', { name: card.emergencyContact.name }) : '',
  ].join(' ');

  return (
    <I18nScope area="public">
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-5">
        <p className="flex items-start gap-3 rounded-2xl bg-[var(--color-ocre-100)] p-4 text-base font-bold text-[var(--color-ocre-700)]" role="note">
          <Eye size={22} className="mt-0.5 shrink-0" aria-hidden />
          {t('Cette consultation est enregistrée et le patient est prévenu.')}
        </p>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">{t('Carte d’urgence Ganji')}</p>
            <h1 className="text-3xl font-bold">{card.name}</h1>
            <p className="text-lg text-[var(--fg-muted)]">
              <span className="num">{t('{age} ans', { age: card.age })}</span> · {SEX[card.sex] ? t(SEX[card.sex]) : card.sex}
              {card.commune ? ` · ${card.commune}` : ''}
            </p>
          </div>
          <ListenButton text={spoken} audioKey="emergency.card" />
        </div>

        <section aria-label={t('Groupe sanguin')} className="card flex items-center gap-5 !border-0 bg-[var(--color-danger-600)] p-6 text-white">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white text-[var(--color-danger-600)]"><Pictogram name="blood" size={44} /></span>
          <div>
            <p className="text-lg font-bold text-white">Groupe sanguin<En>Blood group</En></p>
            <p className="num text-7xl font-bold leading-none sm:text-8xl">{card.bloodGroup ?? '?'}</p>
            {!card.bloodGroup && <p className="text-base">{t('Non renseigné : faire un groupage avant toute transfusion.')}</p>}
          </div>
        </section>

        <section aria-labelledby="h-allergy" className={`card p-5 ${allergies.length ? '!border-2 !border-[var(--color-ocre-500)]' : ''}`}>
          <h2 id="h-allergy" className="flex items-center gap-2 text-xl font-bold">
            <AlertTriangle size={24} className={allergies.length ? 'text-[var(--color-ocre-700)]' : 'text-[var(--fg-muted)]'} aria-hidden /> Allergies
          </h2>
          {allergies.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {allergies.map((a) => (
                <li key={a} className="rounded-2xl bg-[var(--color-ocre-100)] px-4 py-2 text-2xl font-bold text-[var(--color-ocre-700)]">{a}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xl">{t('Aucune allergie connue')}</p>
          )}
        </section>

        <section aria-labelledby="h-treat" className="card p-5">
          <h2 id="h-treat" className="flex items-center gap-2 text-xl font-bold"><Pictogram name="pill" size={24} /> <span>Traitements en cours<En>Current treatment</En></span></h2>
          <p className="mt-2 text-xl">{card.treatments || t('Aucun traitement déclaré')}</p>
        </section>

        <section aria-labelledby="h-contact" className="card space-y-3 p-5">
          <h2 id="h-contact" className="flex items-center gap-2 text-xl font-bold"><Pictogram name="people" size={24} /> <span>Personne à prévenir<En>Emergency contact</En></span></h2>
          {card.emergencyContact ? (
            <>
              <p className="text-xl font-bold">{card.emergencyContact.name ?? t('Contact')}</p>
              {contactPhone && (
                <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="btn btn-primary !min-h-14 text-xl">
                  <Phone size={24} aria-hidden /> <span className="num">{fmtPhone(contactPhone)}</span>
                </a>
              )}
            </>
          ) : (
            <p className="text-lg">{t('Aucun contact renseigné.')}</p>
          )}
        </section>

        <section aria-labelledby="h-pro" className="card space-y-3 p-5">
          <h2 id="h-pro" className="flex items-center gap-2 text-lg font-bold"><ShieldAlert size={22} aria-hidden /> {t('Vous êtes soignant ?')}</h2>
          <p className="text-base text-[var(--fg-muted)]">
            {t('Cette carte ne montre que l’essentiel vital. Pour le dossier complet en urgence, connectez-vous avec votre compte professionnel puis utilisez l’accès « bris de glace » depuis la fiche patient : motif obligatoire, accès limité à 12 h, journalisé et notifié au patient.')}
          </p>
          <Link href="/connexion" className="btn btn-ghost">{t('Je suis soignant : accès complet (bris de glace)')}</Link>
        </section>

        <p className="text-sm text-[var(--fg-muted)]">{t(card.notice)}</p>
        <a href="tel:118" className="btn btn-danger w-full !min-h-14 text-lg"><Phone size={22} aria-hidden /> {t('Sapeurs-pompiers')} <span className="num">118</span></a>
      </main>
    </I18nScope>
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
