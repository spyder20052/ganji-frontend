/**
 * Bouton « Écouter » de chaque écran patient : nom accessible, lecture et arrêt, voix du téléphone en
 * français, enregistrement en langue nationale quand il existe, et repli lisible quand rien n'est disponible.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListenButton } from './ListenButton';

/** Synthèse vocale du téléphone, absente de jsdom. */
class FakeUtterance {
  text: string;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
function fakeSpeech() {
  const spoken: FakeUtterance[] = [];
  const synth = { speak: vi.fn((u: FakeUtterance) => spoken.push(u)), cancel: vi.fn() };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { synth, spoken };
}

/** Lecteur audio, non implémenté dans jsdom : on garde la source demandée. */
class FakeAudio {
  static players: FakeAudio[] = [];
  src: string;
  onended: (() => void) | null = null;
  play = vi.fn(async () => undefined);
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
    FakeAudio.players.push(this);
  }
}

beforeEach(() => {
  FakeAudio.players = [];
  vi.stubGlobal('Audio', FakeAudio);
});
afterEach(() => {
  delete document.documentElement.dataset.voice;
});

describe('bouton Écouter', () => {
  it('porte un nom accessible et n’est pas enfoncé au repos', () => {
    render(<ListenButton text="Bonjour" />);
    expect(screen.getByRole('button', { name: 'Écouter' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('en version compacte (icône seule), le nom reste lu par les lecteurs d’écran', () => {
    render(<ListenButton text="Bonjour" label="Écouter la question" compact />);
    expect(screen.getByRole('button', { name: 'Écouter la question' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('lit le texte avec la voix du téléphone en français, un peu ralentie, puis s’arrête au second appui', async () => {
    const { synth, spoken } = fakeSpeech();
    const user = userEvent.setup();
    render(<ListenButton text="Allez aux urgences maintenant." />);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(spoken[0]).toMatchObject({ text: 'Allez aux urgences maintenant.', lang: 'fr-FR' });
    expect(spoken[0].rate).toBeLessThan(1);
    const stop = screen.getByRole('button', { name: 'Arrêter' });
    expect(stop).toHaveAttribute('aria-pressed', 'true');
    await user.click(stop);
    expect(synth.cancel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Écouter' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('revient au repos quand la lecture se termine d’elle-même', async () => {
    const { spoken } = fakeSpeech();
    const user = userEvent.setup();
    render(<ListenButton text="Bonjour" />);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(screen.getByRole('button', { name: 'Arrêter' })).toBeInTheDocument();
    act(() => spoken[0].onend?.());
    expect(screen.getByRole('button', { name: 'Écouter' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('explique quand le téléphone n’a pas de voix, sans rester bloqué', async () => {
    const user = userEvent.setup();
    render(<ListenButton text="Bonjour" />);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(await screen.findByRole('status')).toHaveTextContent('La lecture vocale n’est pas disponible sur ce téléphone.');
    expect(screen.getByRole('button', { name: 'Écouter' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('joue l’enregistrement en langue nationale quand il existe, et dit qu’il s’agit d’une voix de synthèse', async () => {
    const head = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', head);
    document.documentElement.dataset.voice = 'fon';
    const user = userEvent.setup();
    render(<ListenButton text="Carte d’urgence de Koffi." audioKey="app.carte-urgence" />);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(head).toHaveBeenCalledWith('/audio/fon/app.carte-urgence.mp3', { method: 'HEAD' });
    await waitFor(() => expect(FakeAudio.players).toHaveLength(1));
    expect(FakeAudio.players[0].src).toBe('/audio/fon/app.carte-urgence.mp3');
    expect(FakeAudio.players[0].play).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Voix de synthèse en fon, traduction faite par IA : à faire valider par un locuteur natif.');
    expect(screen.getByRole('button', { name: 'Arrêter' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sans enregistrement dans la langue choisie, le dit et lit en français', async () => {
    const { synth } = fakeSpeech();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(null, { status: 404 })));
    document.documentElement.dataset.voice = 'bariba';
    const user = userEvent.setup();
    render(<ListenButton text="Bonjour" audioKey="app.accueil" />);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Enregistrement en bariba pas encore disponible : lecture en français.');
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(FakeAudio.players).toHaveLength(0);
  });

  it('arrête la lecture quand le bouton disparaît de l’écran', async () => {
    const { synth } = fakeSpeech();
    const user = userEvent.setup();
    const { unmount } = render(<ListenButton text="Bonjour" />);
    await user.click(screen.getByRole('button', { name: 'Écouter' }));
    unmount();
    expect(synth.cancel).toHaveBeenCalled();
  });
});
