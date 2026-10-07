import type { Metadata } from 'next';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import type { Summary } from '@/lib/types';
import { getMe, load } from '../../../_lib/load';
import { SERVICES, type ServiceCode } from '../shared';
import { BookingFlow, type Person } from './BookingFlow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Prendre rendez-vous') };
}

export default async function NouveauRendezVous({ searchParams }: { searchParams: Promise<{ service?: string; patient?: string }> }) {
  const [{ service, patient }, me, t] = await Promise.all([searchParams, getMe(), getT()]);
  const own = me.patientId ? await load<Summary>('/me/summary') : null;
  const s = own?.data ?? null;

  // Pour qui : soi-même, ses enfants, et les personnes qui ont confié leurs rendez-vous.
  const people: Person[] = [
    ...(me.patientId ? [{ id: me.patientId, label: t('Moi'), commune: s?.commune ?? null }] : []),
    ...(s?.children ?? []).map((c) => ({ id: c.id, label: c.firstName, commune: s?.commune ?? null })),
    ...me.delegations
      .filter((d) => d.scopes.includes('appointments') || d.scopes.includes('all'))
      .map((d) => ({ id: d.patient.id, label: `${d.patient.firstName} (${d.relation})`, commune: null })),
  ];
  const initialService = SERVICES.some((x) => x.code === service) ? (service as ServiceCode) : null;
  const initialPerson = people.find((p) => p.id === patient)?.id ?? people[0]?.id ?? null;

  return (
    <I18nScope area="compte">
      <BookingFlow ownId={me.patientId} people={people} initialPerson={initialPerson} initialService={initialService} ownCommune={s?.commune ?? null} />
    </I18nScope>
  );
}
