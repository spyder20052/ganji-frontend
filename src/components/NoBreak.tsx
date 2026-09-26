import { Fragment, type ReactNode } from 'react';

/**
 * Mots à trait d'union gardés sur une seule ligne (« rendez-vous », « CNHU-HKM », « Abomey-Calavi ») :
 * le navigateur coupe sinon après le trait d'union. Le reste du texte passe à la ligne normalement.
 */
export function nobr(text: string): ReactNode {
  const parts = text.split(/(\S*[\p{L}\p{N}]-[\p{L}\p{N}]\S*)/u);
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    i % 2 ? (
      <span key={i} className="whitespace-nowrap">
        {p}
      </span>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}
