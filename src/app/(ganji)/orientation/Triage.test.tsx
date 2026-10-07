/**
 * Arbre d'orientation : parcours des questions jusqu'au conseil, focus déplacé pour le clavier et les lecteurs
 * d'écran, retour en arrière, conseil calculé sur le téléphone sans réseau, détresse prise en compte en premier.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Triage } from './Triage';

type User = ReturnType<typeof userEvent.setup>;
type Route = (init: RequestInit | undefined) => Response;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const body = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as Record<string, unknown>;

const TREE = {
  start: 'q1',
  validatedBy: null,
  disclaimer: 'Ceci est une orientation, pas un diagnostic.',
  nodes: {
    q1: {
      id: 'q1', text: 'Qui est malade ?', pictogram: 'people', audioKey: 'triage.q1',
      answers: [
        { label: 'Un enfant de moins de 5 ans', pictogram: 'child', next: 'q2' },
        { label: 'Un adulte', pictogram: 'adult', next: 'q3' },
      ],
    },
    q2: {
      id: 'q2', text: 'L’enfant a-t-il un signe de danger ?', pictogram: 'warning', audioKey: 'triage.q2',
      answers: [
        { label: 'Il convulse ou ne réagit plus', pictogram: 'convulsion', outcome: 'URGENCE', flags: ['CONVULSIONS'] },
        { label: 'Il a de la fièvre', pictogram: 'fever', outcome: 'CENTRE_SANTE', flags: ['TDR_PALU'] },
        { label: 'Il a une diarrhée sans sang', pictogram: 'diarrhea', outcome: 'PHARMACIE', flags: ['SRO_ZINC'] },
      ],
    },
    q3: {
      id: 'q3', text: 'Quel est le signe principal ?', pictogram: 'other', audioKey: 'triage.q3',
      answers: [
        { label: 'Un rhume léger', pictogram: 'cough', outcome: 'MAISON' },
        { label: 'Des idées noires', pictogram: 'mind', outcome: 'CENTRE_SANTE', flags: ['CRISE', 'ECOUTE'] },
      ],
    },
  },
};
const CHU = { id: 'f1', name: 'CHU-MEL', type: 'CHU', lat: 6.3654, lng: 2.4183, services: ['URGENCES'], open24h: true, onDuty: false, commune: 'Cotonou', distanceKm: 2.1 };
const DEPARTMENTS = [{ code: 'LI', name: 'Littoral', chefLieu: 'Cotonou', lat: 6.37, lng: 2.42, communes: [{ id: 'c1', name: 'Cotonou', lat: 6.3654, lng: 2.4183 }] }];

/** Réponses de POST /triage pour chaque parcours (même texte que les conseils locaux). */
const result = (outcome: string, flags: string[], title: string, advice: string[], extra: Record<string, unknown> = {}) => ({
  complete: true, outcome, flags, title, advice, path: [], places: [], crisis: flags.includes('CRISE'), disclaimer: TREE.disclaimer, ...extra,
});
const API: Record<string, unknown> = {
  '0,0': result('URGENCE', ['CONVULSIONS'], 'Urgence : partez maintenant', ['Rendez-vous immédiatement aux urgences de l’hôpital le plus proche.'], {
    places: [CHU],
    path: [
      { question: 'Qui est malade ?', answer: 'Un enfant de moins de 5 ans' },
      { question: 'L’enfant a-t-il un signe de danger ?', answer: 'Il convulse ou ne réagit plus' },
    ],
  }),
  '0,1': result('CENTRE_SANTE', ['TDR_PALU'], 'Consultez un centre de santé aujourd’hui', ['Ne prenez pas de médicament contre le paludisme sans test.']),
  '0,2': result('PHARMACIE', ['SRO_ZINC'], 'Conseil en pharmacie', ['Pour une diarrhée d’enfant : SRO et zinc pendant 10 jours.']),
  '1,0': result('MAISON', [], 'Soins à la maison', ['Reposez-vous et buvez souvent de l’eau propre.']),
  '1,1': result('CENTRE_SANTE', ['CRISE', 'ECOUTE'], 'Consultez un centre de santé aujourd’hui', ['Allez au centre de santé le plus proche aujourd’hui, sans attendre plusieurs jours.']),
};

const fetchMock = vi.fn<typeof fetch>();
let routes: Record<string, Route>;
let onLine = true;
const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => body(init));

beforeEach(() => {
  onLine = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => onLine);
  routes = {
    'GET /api/triage/tree': () => json(TREE),
    'POST /api/triage': (init) => json(API[(body(init).answers as number[]).join(',')] ?? { complete: false }),
    'GET /api/geo/departments': () => json(DEPARTMENTS),
  };
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const route = routes[key];
    if (!route) throw new Error(`Appel inattendu : ${key}`);
    return route(init);
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.restoreAllMocks());

const question = (text: string) => screen.findByRole('heading', { level: 2, name: text });
const outcome = (text: string) => screen.findByRole('heading', { level: 2, name: text });
async function answer(user: User, label: string) {
  await user.click(await screen.findByRole('button', { name: label }));
}

describe('questions', () => {
  it('charge l’arbre puis pose la première question, avec ses réponses et l’étape', async () => {
    render(<Triage />);
    expect(screen.getByRole('status')).toHaveTextContent('Chargement des questions…');
    expect(await question('Qui est malade ?')).toBeInTheDocument();
    expect(screen.getByText('Étape 1 sur 4 max')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Un enfant de moins de 5 ans' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Un adulte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Écouter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument();
    expect(screen.getByText('Orientation, pas diagnostic.')).toBeInTheDocument();
  });

  it('avance de question en question et déplace le focus sur la nouvelle question', async () => {
    const user = userEvent.setup();
    render(<Triage />);
    await answer(user, 'Un enfant de moins de 5 ans');
    expect(await question('L’enfant a-t-il un signe de danger ?')).toHaveFocus();
    expect(screen.getByText('Étape 2 sur 4 max')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument();
    expect(posts()).toEqual([]);
  });

  it('se parcourt au clavier : Entrée sur une réponse passe à la suite', async () => {
    const user = userEvent.setup();
    render(<Triage />);
    (await screen.findByRole('button', { name: 'Un adulte' })).focus();
    await user.keyboard('{Enter}');
    expect(await question('Quel est le signe principal ?')).toHaveFocus();
  });

  it('« Retour » revient à la question précédente et oublie la réponse donnée', async () => {
    const user = userEvent.setup();
    render(<Triage />);
    await answer(user, 'Un adulte');
    await question('Quel est le signe principal ?');
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await question('Qui est malade ?')).toBeInTheDocument();
    expect(screen.getByText('Étape 1 sur 4 max')).toBeInTheDocument();
    await answer(user, 'Un enfant de moins de 5 ans');
    expect(await question('L’enfant a-t-il un signe de danger ?')).toBeInTheDocument();
  });
});

describe('résultat', () => {
  it('oriente vers les urgences : consigne, numéros, gestes à faire, réponses données, lieux à préciser', async () => {
    const user = userEvent.setup();
    render(<Triage />);
    await answer(user, 'Un enfant de moins de 5 ans');
    await answer(user, 'Il convulse ou ne réagit plus');
    expect(await outcome('Allez aux urgences maintenant')).toHaveFocus();
    expect(screen.getByRole('link', { name: /Sapeurs-pompiers/ })).toHaveAttribute('href', 'tel:118');
    expect(screen.getByRole('link', { name: /Police secours/ })).toHaveAttribute('href', 'tel:117');
    expect(screen.getByText(/Pendant les convulsions : protégez la tête/)).toBeInTheDocument();
    expect(screen.getByText('Rendez-vous immédiatement aux urgences de l’hôpital le plus proche.')).toBeInTheDocument();
    await waitFor(() => expect(posts()).toEqual([{ answers: [0, 0] }]));
    expect(screen.getByText('Mes réponses (2)')).toBeInTheDocument();
    expect(screen.getByText('Il convulse ou ne réagit plus', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Urgences ouvertes les plus proches' })).toBeInTheDocument();
    expect(screen.getByText('Indiquez où vous êtes pour voir le lieu le plus proche.')).toBeInTheDocument();
  });

  it('sans GPS, la commune choisie sert à trouver les lieux proches', async () => {
    const user = userEvent.setup();
    render(<Triage />);
    await question('Qui est malade ?');
    await user.click(screen.getByRole('button', { name: 'Me localiser' }));
    expect(await screen.findByText(/Position indisponible sur ce téléphone/)).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Cotonou' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ma commune' }), 'Cotonou');
    expect(await screen.findByText(/Commune choisie : les lieux les plus proches seront proposés/)).toBeInTheDocument();
    await answer(user, 'Un enfant de moins de 5 ans');
    await answer(user, 'Il convulse ou ne réagit plus');
    expect(await screen.findByText('CHU-MEL')).toBeInTheDocument();
    expect(screen.getByText('à 2,1 km')).toBeInTheDocument();
    expect(posts()).toEqual([{ answers: [0, 0], lat: 6.3654, lng: 2.4183 }]);
  });

  it('hors ligne : conseil calculé sur le téléphone, sans appel à l’API, lieux remis au retour du réseau', async () => {
    onLine = false;
    const user = userEvent.setup();
    render(<Triage />);
    await answer(user, 'Un enfant de moins de 5 ans');
    await answer(user, 'Il a de la fièvre');
    expect(await outcome('Allez au centre de santé aujourd’hui')).toBeInTheDocument();
    expect(screen.getByText(/Hors ligne : conseil calculé sur votre téléphone/)).toBeInTheDocument();
    expect(screen.getByText('Demandez un test rapide du paludisme (TDR).')).toBeInTheDocument();
    expect(screen.getByText('Ne prenez pas de médicament contre le paludisme sans test.')).toBeInTheDocument();
    expect(posts()).toEqual([]);
    expect(screen.queryByRole('heading', { name: 'Centres de santé les plus proches' })).not.toBeInTheDocument();
  });

  it('si l’API ne répond pas, garde le conseil calculé localement et le signale', async () => {
    routes['POST /api/triage'] = () => {
      throw new TypeError('Failed to fetch');
    };
    const user = userEvent.setup();
    render(<Triage />);
    await answer(user, 'Un adulte');
    await answer(user, 'Un rhume léger');
    expect(await outcome('Vous pouvez vous soigner à la maison')).toBeInTheDocument();
    expect(await screen.findByText(/Hors ligne : conseil calculé sur votre téléphone/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Allez au centre de santé si…' })).toBeInTheDocument();
  });

  it('en cas de détresse, propose d’abord de parler à quelqu’un', async () => {
    const user = userEvent.setup();
    render(<Triage />);
    await answer(user, 'Un adulte');
    await answer(user, 'Des idées noires');
    expect(await screen.findByRole('heading', { name: 'Vous n’êtes pas seul·e.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parler à quelqu’un maintenant' })).toHaveAttribute('href', '/app/ecoute');
    expect(screen.getByRole('link', { name: /Appeler le 118/ })).toHaveAttribute('href', 'tel:118');
  });

  it('« Modifier ma réponse » revient à la dernière question ; « Recommencer » repart du début', async () => {
    const user = userEvent.setup();
    render(<Triage />);
    await answer(user, 'Un enfant de moins de 5 ans');
    await answer(user, 'Il convulse ou ne réagit plus');
    await outcome('Allez aux urgences maintenant');
    await user.click(screen.getByRole('button', { name: 'Modifier ma réponse' }));
    expect(await question('L’enfant a-t-il un signe de danger ?')).toBeInTheDocument();
    expect(screen.getByText('Étape 2 sur 4 max')).toBeInTheDocument();
    await answer(user, 'Il a une diarrhée sans sang');
    await outcome('Demandez conseil en pharmacie');
    await user.click(screen.getByRole('button', { name: 'Recommencer' }));
    expect(await question('Qui est malade ?')).toBeInTheDocument();
    expect(screen.getByText('Étape 1 sur 4 max')).toBeInTheDocument();
  });
});

describe('sans réseau au chargement', () => {
  it('explique, garde les numéros d’urgence, et « Réessayer » recharge les questions', async () => {
    let attempts = 0;
    routes['GET /api/triage/tree'] = () => {
      attempts++;
      if (attempts === 1) throw new TypeError('Failed to fetch');
      return json(TREE);
    };
    const user = userEvent.setup();
    render(<Triage />);
    expect(await screen.findByText('Les questions n’ont pas pu être chargées (pas de réseau).')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sapeurs-pompiers/ })).toHaveAttribute('href', 'tel:118');
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await question('Qui est malade ?')).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
