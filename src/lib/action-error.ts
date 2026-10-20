// Les actions serveur appelées par un simple bouton n'ont pas d'endroit où afficher une erreur.
// On lève donc une exception : elle est attrapée par `src/app/(app)/error.tsx`, qui affiche un
// message clair au lieu de laisser croire que l'action a réussi.

/**
 * Échoue si la base a renvoyé une erreur, ou si aucune ligne n'a été touchée.
 * Le second cas est important : une règle d'isolation (RLS) qui refuse une écriture
 * ne renvoie PAS d'erreur, elle ignore simplement la demande.
 */
export function assertChanged(error: unknown, rows: unknown[] | null, message: string): void {
  if (error || !rows?.length) throw new Error(message);
}
