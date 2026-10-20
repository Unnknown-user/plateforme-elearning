import { ArrowDown, ArrowUp } from "lucide-react";

/** Deux flèches (monter / descendre) ; chacune envoie un petit formulaire à l'action serveur. */
export function MoveButtons({
  action,
  fields,
  index,
  count,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  index: number;
  count: number;
  label: string;
}) {
  return (
    <div className="flex">
      {(["up", "down"] as const).map((direction) => {
        const disabled = direction === "up" ? index === 0 : index === count - 1;
        const text = `${direction === "up" ? "Monter" : "Descendre"} ${label}`;
        return (
          <form key={direction} action={action}>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <input type="hidden" name="direction" value={direction} />
            <button
              disabled={disabled}
              title={text}
              aria-label={text}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              {direction === "up" ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}
            </button>
          </form>
        );
      })}
    </div>
  );
}
