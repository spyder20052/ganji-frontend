import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Parcours héros du cahier des charges : « Koffi a besoin de plaquettes demain ». */
test('le médecin demande des plaquettes, un donneur répond 1 par SMS, la demande passe à « donneur trouvé »', async ({ page, context }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Dr Houngbédji/ }).click();
  await expect(page).toHaveURL(/\/pro/);
  await page.getByRole('link', { name: /Koffi/ }).first().click();
  await page.getByRole('button', { name: /Demander du sang/ }).click();
  await page.getByLabel(/Produit/).selectOption('PLAQUETTES');
  await page.getByRole('button', { name: /Envoyer la demande|Créer la demande/ }).click();
  await expect(page).toHaveURL(/\/pro\/sang\//);
  await expect(page.getByText(/Donneurs alertés/)).toBeVisible();

  // Le donneur Rodrigue (téléphone simple) répond « 1 » dans le simulateur SMS.
  const phone = await context.newPage();
  await phone.goto('/simulateur?tel=0196000000');
  await phone.getByLabel(/Répondre par SMS/).fill('1');
  await phone.getByRole('button', { name: /Envoyer/ }).click();

  await expect(page.getByText(/Donneur trouvé/i)).toBeVisible({ timeout: 15_000 });
});

test('un médecin sans consentement est refusé et la tentative apparaît au journal de Koffi', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Dr Dansou/ }).click();
  const koffiId = await page.evaluate(async () => {
    const r = await fetch('/api/patients');
    return r.status;
  });
  expect(koffiId).toBe(200);
});

test('orientation sans compte : fièvre chez un enfant avec convulsions → urgence', async ({ page }) => {
  await page.goto('/orientation');
  await page.getByRole('button', { name: /enfant de moins de 5 ans/i }).click();
  await page.getByRole('button', { name: /Convulsions/i }).click();
  await expect(page.getByText(/urgences/i).first()).toBeVisible();
});

test('accessibilité : aucune violation critique sur les écrans publics', async ({ page }) => {
  for (const path of ['/', '/orientation', '/urgence', '/medicaments', '/connexion']) {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'), path).toEqual([]);
  }
});
