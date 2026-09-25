import type { Metadata } from 'next';
import { Pictogram } from '@/components/Pictogram';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import { fmtDateTime } from '@/lib/format';
import { Empty, ErrorNote, PageHead, Section } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import { SymptomForm } from './SymptomForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Je ne me sens pas bien') };
}

interface SymptomLog { id: string; symptom: string; label: string; severity: number; note: string | null; alert: boolean; at: string }
const LEVEL = ['', 'un peu', 'moyen', 'fort'];

export default async function SymptomesPage() {
  const t = await getT();
  const locale = await getLocale();
  const me = await getMe();
  const res = me.patientId ? await load<SymptomLog[]>('/care/symptoms') : null;
  const list = res?.data ?? [];

  return (
    <I18nScope area="patient2">
      <PageHead
        icon="fever"
        title={t('Je ne me sens pas bien')}
        intro={t('Deux gestes : ce que vous ressentez, puis si c’est fort. Si c’est un signe d’alerte, votre équipe de soins est prévenue tout de suite.')}
        listen={t("Touchez l'image de ce que vous ressentez : fièvre, douleur, saignement, fatigue, vomissements, essoufflement ou bleus. Puis dites si c'est un peu, moyen ou fort.")}
        audioKey="app.symptomes"
      />
      {me.patientId ? (
        <Section id="h-noter" title={t('Noter un symptôme')} icon="fever">
          <SymptomForm />
        </Section>
      ) : (
        <Empty>{t('Le journal de symptômes est rattaché au carnet du patient.')}</Empty>
      )}

      {res && (
        <Section id="h-histo" title={t('Ce que j’ai noté')} icon="calendar" className="simple-hide">
          {res.error && <ErrorNote error={res.error} />}
          {res.data && list.length === 0 && <Empty>{t('Rien de noté pour le moment.')}</Empty>}
          <ul className="space-y-2">
            {list.map((s) => (
              <li key={s.id} className={`flex items-center gap-3 rounded-2xl p-3 ${s.alert ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : 'bg-[var(--bg)]'}`}>
                <span className="chip-round shrink-0 text-[var(--color-brand-900)]"><Pictogram name={s.symptom} size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {t(s.label)} · {LEVEL[s.severity] != null ? t(LEVEL[s.severity]) : s.severity}
                  </span>
                  <span className="block text-sm opacity-80">{fmtDateTime(s.at, locale)}{s.note ? ` · ${s.note}` : ''}</span>
                </span>
                {s.alert && <span className="pill bg-[var(--color-danger-600)] text-white">{t('Équipe prévenue')}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </I18nScope>
  );
}
