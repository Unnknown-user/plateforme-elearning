"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { enrollLearners } from "@/app/(app)/courses/enrollment-actions";
import { filterLearners, sortByFamilyName } from "@/lib/learner-search";
import type { EnrollmentLearner } from "@/lib/enrollments";

/**
 * Inscription d'apprenants : recherche par nom, cases à cocher, un seul bouton « Inscrire ».
 * La sélection est conservée quand on change la recherche (on peut chercher, cocher, chercher encore).
 */
export function EnrollSearch({ courseId, learners }: { courseId: string; learners: EnrollmentLearner[] }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Après une inscription, les personnes inscrites quittent la liste : on les retire aussi de la sélection.
  const selected = useMemo(() => new Set([...picked].filter((id) => learners.some((l) => l.id === id))), [picked, learners]);

  const sorted = useMemo(() => sortByFamilyName(learners), [learners]);
  const visible = useMemo(() => filterLearners(sorted, query), [sorted, query]);
  const allVisibleSelected = visible.length > 0 && visible.every((l) => selected.has(l.id));

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleVisible = () =>
    setPicked((current) => {
      const next = new Set(current);
      for (const learner of visible) {
        if (allVisibleSelected) next.delete(learner.id);
        else next.add(learner.id);
      }
      return next;
    });

  return (
    <form action={enrollLearners} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      {/* Les personnes cochées sont envoyées même si la recherche les masque. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="learnerId" value={id} />
      ))}

      <label className="block text-sm font-medium text-zinc-900">
        Inscrire des apprenants
        <span className="relative mt-1 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // « Entrée » dans la recherche ne doit pas envoyer le formulaire par erreur.
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="Rechercher par nom ou prénom"
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-400 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900"
          />
        </span>
      </label>

      <div className="rounded-lg border border-zinc-200">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm">
          <label className="inline-flex items-center gap-2 text-zinc-800">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} disabled={visible.length === 0} className="h-4 w-4" />
            {query.trim() ? "Tout cocher (résultats)" : "Tout cocher"}
          </label>
          <span role="status" className="text-zinc-600">
            {visible.length} apprenant{visible.length > 1 ? "s" : ""} · {selected.size} coché{selected.size > 1 ? "s" : ""}
          </span>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-3 text-sm text-zinc-600">Aucun apprenant ne correspond à « {query.trim()} ».</p>
        ) : (
          <ul className="max-h-60 divide-y divide-zinc-100 overflow-y-auto">
            {visible.map((learner) => (
              <li key={learner.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50">
                  <input type="checkbox" checked={selected.has(learner.id)} onChange={() => toggle(learner.id)} className="h-4 w-4" />
                  {learner.fullName}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={selected.size === 0}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-contrast)] disabled:opacity-50"
      >
        <UserPlus className="h-4 w-4" aria-hidden /> Inscrire{selected.size > 0 ? ` (${selected.size})` : ""}
      </button>
    </form>
  );
}
