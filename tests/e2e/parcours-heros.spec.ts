import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext } from '@playwright/test';

/** Connexion par compte de démonstration ; renvoie la personne connectée (rôle, patientId…). */
async function loginAs(request: APIRequestContext, persona: string): Promise<{ patientId?: string }> {
  const res = await request.post(`/api/auth/demo/${persona}`);
  expect(res.ok(), `connexion ${persona}`).toBeTruthy();
  return res.json();
}

/** Identifiant du carnet de Koffi, puis la session est fermée. */
async function koffiId(request: APIRequestContext, clear: () => Promise<void>) {
  const { patientId } = await loginAs(request, 'koffi');
  expect(patientId).toBeTruthy();
  await clear();
  return patientId as string;
}

/** Parcours héros du cahier des charges : « Koffi a besoin de plaquettes demain ». */
test('le médecin demande des plaquettes, un donneur répond 1 par SMS, la demande passe à « donneur trouvé »', async ({ page, context }) => {
  const id = await koffiId(context.request, () => context.clearCookies());
  await loginAs(context.request, 'houngbedji');
  await page.goto(`/pro/patients/${id}`);
  await page.getByRole('button', { name: 'Demander du sang' }).click();
  await page.getByRole('button', { name: /^Demander \d poche/ }).click();
  await page.waitForURL(/\/pro\/sang\//);

  // Rodrigue, sur un simple téléphone à touches, répond « 1 » dans le simulateur SMS.
  const phone = await context.newPage();
  await phone.goto('/simulateur?tel=0196000000');
  await phone.getByLabel('Répondre par SMS').fill('1');
  await phone.getByRole('button', { name: 'Envoyer le SMS' }).click();

  await expect(page.locator('main')).toContainText(/Donneur trouvé\s*:\s*fait/, { timeout: 30_000 });
});

test('un médecin sans consentement est refusé, et la tentative apparaît au journal de Koffi', async ({ page, context }) => {
  const id = await koffiId(context.request, () => context.clearCookies());
  await loginAs(context.request, 'dr-sans-consentement');
  expect((await context.request.get(`/api/patients/${id}/summary`)).status()).toBe(403);
  await page.goto(`/pro/patients/${id}`);
  await expect(page.getByText(/consentement/i).first()).toBeVisible();

  await context.clearCookies();
  await loginAs(context.request, 'koffi');
  await page.goto('/app/partage');
  // L'entrée « Dr Dansou » est dans le journal d'accès (section repliée par défaut).
  await expect(page.locator('main')).toContainText('Dr Dansou');
});

test('orientation sans compte : un enfant qui convulse → urgences', async ({ page }) => {
  await page.goto('/orientation');
  await page.getByRole('button', { name: /enfant de moins de 5 ans/i }).click();
  await page.getByRole('button', { name: /Convulsions/i }).click();
  await expect(page.getByRole('heading', { name: 'Allez aux urgences maintenant' })).toBeVisible();
});

test('interface en anglais : le choix de langue est gardé et la page suit', async ({ page, context }) => {
  await context.addCookies([{ name: 'ganji-lang', value: 'en', url: test.info().project.use.baseURL ?? 'http://localhost:3000' }]);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your health, followed everywhere.');
  await expect(page.getByRole('link', { name: /^Open my (health )?record$/ }).first()).toBeVisible();
});

test('accessibilité : aucune violation grave sur les écrans publics', async ({ page }) => {
  // Rendu final, sans les animations d'entrée : un contraste mesuré en plein fondu ne veut rien dire.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/orientation', '/urgence', '/medicaments', '/connexion']) {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'), path).toEqual([]);
  }
});
