/**
 * Médicaments qui se commandent seulement avec une ordonnance (même règle que l'API, pour ne pas
 * proposer « Commander » dans la recherche publique) : anticancéreux, antibiotiques, psychotropes…
 */
export function requiresPrescription(m: { atc: string | null; form: string }): boolean {
  const atc = (m.atc ?? '').toUpperCase();
  if (['L', 'N02A', 'N03', 'N05', 'N06', 'J01', 'J04', 'J05', 'H02', 'A10A', 'G02AD'].some((p) => atc.startsWith(p))) return true;
  return /inject|perfusion|ampoule|stylo/i.test(m.form);
}
