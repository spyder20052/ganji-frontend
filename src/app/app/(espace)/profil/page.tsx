import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { fmtPhone } from '@/lib/format';
import { ErrorNote } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import type { Profile } from '../../_lib/profile';
import { ProfileBlocks } from './ProfileBlocks';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Mon profil') };
}

const CHECKS = [
  { key: 'bloodGroup', label: 'Groupe sanguin', anchor: 'sang' },
  { key: 'emergencyContact', label: 'Personne à prévenir', anchor: 'contact' },
  { key: 'commune', label: 'Commune', anchor: 'adresse' },
  { key: 'allergies', label: 'Allergies', anchor: 'allergies' },
] as const;

export default async function ProfilPage() {
  const [me, t] = await Promise.all([getMe(), getT()]);
  const res = await load<Profile>('/me/profile');
  const p = res.data;
  const patient = p?.patient ?? null;
  const name = patient ? `${patient.firstName} ${patient.lastName}` : (p?.account.displayName ?? me.displayName);
  const missing = patient?.missing ?? [];
  const done = CHECKS.length - missing.length;

  const listen = patient
    ? [
        t('Votre profil.'),
        missing.length
          ? t('Il manque {n} information(s) utiles en urgence. Touchez une case pour la remplir.', { n: missing.length })
          : t('Votre profil est complet. Il remplit votre carte d’urgence.'),
        t('Votre numéro de téléphone sert à vous connecter : il ne se change pas ici.'),
      ].join(' ')
    : t('Votre compte d’aidant : votre nom et votre langue. Les carnets des personnes que vous aidez s’ouvrent depuis l’accueil.');

  return (
    <I18nScope area="compte">
      {/* Carte d'identité : le nom, le numéro de connexion, et ce qui sert en urgence. */}
      <header className="motif-foret -mx-4 -mt-2 space-y-4 rounded-b-[2rem] px-4 pt-6 pb-6 text-white sm:mx-0 sm:mt-0 sm:rounded-[var(--radius-card)] sm:px-6">
        <div className="flex items-center gap-4">
          <span aria-hidden className="display grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--color-leaf)] text-[1.8rem] text-[var(--color-ink)]">
            {name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.7rem] leading-tight font-medium tracking-tight">{t('Mon profil')}</h1>
            <p className="text-lg leading-snug font-semibold [overflow-wrap:anywhere] text-white/90">{name}</p>
          </div>
          <ListenButton text={listen} audioKey="app.profil" compact />
        </div>
        {p?.account.phone && (
          <p className="flex items-center gap-2 text-base text-white/85">
            <Lock size={16} aria-hidden />
            <span className="num">{fmtPhone(p.account.phone)}</span>
            <span className="sr-only">{t('Votre numéro sert à vous connecter : il ne se change pas ici.')}</span>
          </p>
        )}
        {patient && (
          <nav aria-label={t('Ce qui sert en urgence : {n} sur {total}', { n: done, total: CHECKS.length })}>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CHECKS.map((c) => {
                const ok = !missing.includes(c.key);
                return (
                  <li key={c.key}>
                    <Link
                      href={`#${c.anchor}`}
                      className={`flex min-h-12 items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-base font-medium ${ok ? 'bg-white/12 text-white ring-1 ring-white/25' : 'bg-[var(--color-leaf)] text-[var(--color-ink)]'}`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${ok ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : 'bg-white/70 text-[var(--color-ink)]'}`}>
                        {ok ? <Check size={18} aria-hidden /> : <span aria-hidden className="text-lg leading-none">+</span>}
                      </span>
                      <span className="min-w-0 leading-tight">{t(c.label)}</span>
                      <span className="sr-only">{ok ? t('rempli') : t('à compléter')}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      {res.error && <ErrorNote what={t('Mon profil')} error={res.error} />}

      {p && !patient && (
        <section className="card space-y-3 p-5">
          <p className="text-lg">{t('Vous êtes aidant : vous n’avez pas de carnet à votre nom.')}</p>
          {me.delegations.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {me.delegations.map((d) => (
                <li key={d.patient.id}>
                  <Link href={`/app/carnet?patient=${d.patient.id}`} className="btn btn-soft w-full">
                    {t('Carnet de {prenom}', { prenom: d.patient.firstName })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {p && <ProfileBlocks profile={p} />}
    </I18nScope>
  );
}
