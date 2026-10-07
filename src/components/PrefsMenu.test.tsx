/**
 * Réglages d'accessibilité : chaque choix s'applique tout de suite à la page et se retrouve au prochain
 * passage ; la langue reste reconnaissable même sans lire celle affichée.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrefsMenu } from './PrefsMenu';

const root = () => document.documentElement;
const saved = () => JSON.parse(localStorage.getItem('ganji-prefs') ?? '{}') as Record<string, unknown>;

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'ganji-lang=; max-age=0; path=/';
  root().removeAttribute('style');
  delete root().dataset.theme;
  delete root().dataset.voice;
  delete root().dataset.simple;
});

describe('menu des réglages', () => {
  it('s’ouvre par un bouton nommé et propose chaque langue écrite dans sa langue', () => {
    render(<PrefsMenu />);
    expect(screen.getByLabelText('Réglages d’affichage et de voix')).toBeInTheDocument();
    const fr = screen.getByRole('button', { name: 'Français' });
    const en = screen.getByRole('button', { name: 'English' });
    expect(fr).toHaveAttribute('aria-pressed', 'true');
    expect(fr).toHaveAttribute('lang', 'fr');
    expect(en).toHaveAttribute('aria-pressed', 'false');
    expect(en).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('button', { name: 'Fɔngbè' })).toHaveAttribute('lang', 'fon');
  });

  it('agrandit le texte tout de suite et s’en souvient', async () => {
    const user = userEvent.setup();
    render(<PrefsMenu />);
    await user.click(screen.getByRole('button', { name: '150%' }));
    expect(root().style.getPropertyValue('--text-scale')).toBe('1.5');
    expect(screen.getByRole('button', { name: '150%' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '100%' })).toHaveAttribute('aria-pressed', 'false');
    expect(saved()).toMatchObject({ scale: '1.5' });
  });

  it('active le mode simple (4 grosses actions) puis le retire', async () => {
    const user = userEvent.setup();
    render(<PrefsMenu />);
    const box = screen.getByRole('checkbox', { name: /Mode simple/ });
    await user.click(box);
    expect(root().dataset.simple).toBe('1');
    expect(saved()).toMatchObject({ simple: true });
    await user.click(box);
    expect(root().dataset.simple).toBeUndefined();
    expect(saved()).toMatchObject({ simple: false });
  });

  it('change le thème et revient en automatique', async () => {
    const user = userEvent.setup();
    render(<PrefsMenu />);
    await user.click(screen.getByRole('button', { name: 'Sombre' }));
    expect(root().dataset.theme).toBe('dark');
    expect(saved()).toMatchObject({ theme: 'dark' });
    await user.click(screen.getByRole('button', { name: 'Auto' }));
    expect(root().dataset.theme).toBeUndefined();
    expect(saved().theme).toBeUndefined();
  });

  it('règle la langue de la voix, en annonçant si c’est une synthèse ou un enregistrement à venir', async () => {
    const user = userEvent.setup();
    render(<PrefsMenu />);
    const select = screen.getByRole('combobox', { name: 'Langue de la voix' });
    expect(screen.getByRole('option', { name: 'Fon (Fɔngbè) · voix de synthèse' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bariba (Baatonum) · bientôt' })).toBeInTheDocument();
    await user.selectOptions(select, 'fon');
    expect(root().dataset.voice).toBe('fon');
    expect(saved()).toMatchObject({ voice: 'fon' });
  });

  it('retrouve les réglages enregistrés à l’ouverture', async () => {
    localStorage.setItem('ganji-prefs', JSON.stringify({ scale: '2', theme: 'light', simple: true, voice: 'yoruba' }));
    render(<PrefsMenu />);
    expect(await screen.findByRole('button', { name: '200%', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clair' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: /Mode simple/ })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Langue de la voix' })).toHaveValue('yoruba');
  });

  it('change la langue de l’interface : cookie posé et préférence envoyée à l’API avant rechargement', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    // jsdom ne sait pas recharger une page : il le signale par console.error, sans lever d'erreur.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<PrefsMenu />);
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(document.cookie).toContain('ganji-lang=en');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/me/lang', expect.objectContaining({ method: 'POST', body: '{"lang":"en"}' })));
    quiet.mockRestore();
  });

  it('ne fait rien si l’on choisit la langue déjà affichée', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<PrefsMenu />);
    await user.click(screen.getByRole('button', { name: 'Français' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('ganji-lang');
  });
});
