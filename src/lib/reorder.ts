// Réordonnancement en base, partagé par les actions « monter / descendre ».
// Ce fichier n'est volontairement PAS un fichier d'actions serveur ("use server") : une fonction
// exportée depuis un tel fichier deviendrait appelable depuis le navigateur.
import { createClient } from "@/lib/supabase/server";
import { isDirection, moveItem } from "@/lib/ordering";

/** Renumérote 1..n les éléments d'une liste après avoir déplacé l'un d'eux. */
export async function reorder(
  table: "modules" | "contents" | "questions",
  parentColumn: string,
  parentId: string,
  itemId: string,
  direction: string,
) {
  if (!isDirection(direction)) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("id, position")
    .eq(parentColumn, parentId)
    .order("position")
    .order("id")
    .returns<{ id: string; position: number }[]>();
  if (!data) throw new Error("Le nouvel ordre n'a pas pu être enregistré.");

  const ids = data.map((row) => row.id);
  const reordered = moveItem(ids, ids.indexOf(itemId), direction);
  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i] !== ids[i] || data[i]!.position !== i + 1) {
      const { error } = await supabase.from(table).update({ position: i + 1 }).eq("id", reordered[i]!);
      if (error) throw new Error("Le nouvel ordre n'a pas pu être enregistré.");
    }
  }
}
