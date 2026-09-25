import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone, QrCode } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { TopBar } from '@/components/TopBar';
import { NearestEmergency } from './NearestEmergency';

export const metadata: Metadata = {
  title: 'Urgence',
  description: 'Numéros d’urgence du Bénin, hôpital ouvert le plus proche et gestes qui sauvent.',
};

const NUMBERS = [
  { n: '118', label: 'Sapeurs-pompiers', hint: 'Accident, malaise, incendie, noyade' },
  { n: '117', label: 'Police secours', hint: 'Agression, danger immédiat' },
];

/** Gestes de premiers secours : une consigne courte par carte, lisible et écoutable. */
const FIRST_AID = [
  { icon: 'bleeding', title: 'Saignement', text: 'Appuyez fort sur la plaie avec un tissu propre. Ne relâchez pas.', key: 'firstaid.bleeding' },
  { icon: 'lethargy', title: 'Personne inconsciente qui respire', text: 'Couchez-la sur le côté (position latérale de sécurité). Surveillez sa respiration.', key: 'firstaid.pls' },
  { icon: 'swelling', title: 'Brûlure', text: 'Mettez la brûlure sous l’eau propre pendant 15 minutes. Pas d’huile, pas de dentifrice.', key: 'firstaid.burn' },
  { icon: 'convulsion', title: 'Convulsions', text: 'Protégez la tête, écartez les objets. Ne mettez rien dans la bouche. Puis couchez sur le côté.', key: 'firstaid.seizure' },
];

const SPOKEN =
  'Urgence. Appelez le 118 pour les sapeurs-pompiers, ou le 117 pour la police. ' +
  FIRST_AID.map((f) => `${f.title} : ${f.text}`).join(' ');

export default function UrgencePage() {
  return (
    <>
      <TopBar />
      <main id="contenu" className="mx-auto max-w-4xl space-y-8 px-4 pb-16 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="label">Sans compte · gratuit</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 text-4xl font-bold">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-danger-600)] text-white"><Pictogram name="emergency" size={30} /></span>
              Urgence
            </h1>
          </div>
          <ListenButton text={SPOKEN} audioKey="emergency.page" />
        </div>

        <section aria-labelledby="h-call" className="space-y-3">
          <h2 id="h-call" className="text-xl font-bold">Appeler les secours</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {NUMBERS.map((x) => (
              <a
                key={x.n}
                href={`tel:${x.n}`}
                className="card flex items-center gap-5 !border-0 bg-[var(--color-danger-600)] p-6 text-white transition-transform active:scale-[.98]"
                aria-label={`Appeler le ${x.n}, ${x.label}`}
              >
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-[var(--color-danger-600)]"><Phone size={32} aria-hidden /></span>
                <span className="min-w-0">
                  <span className="num block text-[clamp(2.5rem,16vw,3.75rem)] font-bold leading-none">{x.n}</span>
                  <span className="mt-1 block text-xl font-bold">{x.label}</span>
                  <span className="block text-base text-white">{x.hint}</span>
                </span>
              </a>
            ))}
          </div>
          <p className="text-base text-[var(--fg-muted)]">Appel gratuit depuis tous les réseaux. Dites : où vous êtes, ce qui se passe, combien de personnes.</p>
        </section>

        <NearestEmergency />

        <section aria-labelledby="h-aid" className="space-y-3">
          <h2 id="h-aid" className="text-xl font-bold">Les bons gestes en attendant</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {FIRST_AID.map((f) => (
              <li key={f.key} className="card flex flex-col gap-3 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name={f.icon} size={30} /></span>
                  <h3 className="text-lg font-bold">{f.title}</h3>
                </div>
                <p className="text-lg">{f.text}</p>
                <div className="mt-auto"><ListenButton text={`${f.title}. ${f.text}`} audioKey={f.key} /></div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-[var(--fg-muted)]">Gestes de base, à valider par des formateurs en secourisme. Ils ne remplacent pas l’arrivée des secours.</p>
        </section>

        <section className="card flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-900)] text-white"><QrCode size={28} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">Ma carte d’urgence</h2>
            <p className="text-base text-[var(--fg-muted)]">Groupe sanguin, allergies, personne à prévenir : lisible par les secours, même sans réseau.</p>
          </div>
          <Link href="/app/carte-urgence" className="btn btn-primary">Ouvrir ma carte</Link>
        </section>

        <p className="text-base">
          Pas sûr que ce soit grave ? <Link href="/orientation" className="font-bold underline">Répondez à 4 questions</Link> pour savoir où aller.
        </p>
      </main>
    </>
  );
}
