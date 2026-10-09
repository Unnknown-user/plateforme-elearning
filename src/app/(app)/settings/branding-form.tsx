"use client";

import { useActionState, useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import { Card } from "@/components/page-header";
import { contrastColor, initials } from "@/lib/branding";
import { updateBranding, type BrandingState } from "./actions";

type Props = { name: string; color: string; logoUrl: string | null };

export function BrandingForm({ name: initialName, color: initialColor, logoUrl }: Props) {
  const [state, action, pending] = useActionState<BrandingState, FormData>(updateBranding, {
    status: "idle",
    message: null,
  });
  // États locaux : servent uniquement à l'aperçu en direct.
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [preview, setPreview] = useState<string | null>(logoUrl);

  const fieldClass = "mt-1 w-full rounded-lg border border-zinc-400 bg-white p-2.5 text-zinc-900";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <form action={action} className="space-y-5">
          <label className="block text-sm font-medium text-zinc-900">
            Nom de l&apos;organisme
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className={fieldClass}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-900">
            Couleur principale
            <span className="mt-1 flex items-center gap-3">
              <input
                name="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-16 cursor-pointer rounded-lg border border-zinc-400 bg-white p-1"
              />
              <span className="font-mono text-sm text-zinc-600">{color}</span>
            </span>
          </label>

          <label className="block text-sm font-medium text-zinc-900">
            Logo <span className="font-normal text-zinc-600">(PNG, JPEG ou WebP, 1 Mo maximum)</span>
            <input
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
              className={`${fieldClass} text-sm`}
            />
          </label>

          {state.message && (
            <p
              role={state.status === "error" ? "alert" : "status"}
              className={`flex items-center gap-2 text-sm ${state.status === "error" ? "text-red-700" : "text-green-700"}`}
            >
              {state.status === "success" && <Check className="h-4 w-4" aria-hidden />}
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{ backgroundColor: color, color: contrastColor(color) }}
            className="rounded-lg px-5 py-2.5 font-medium disabled:opacity-60"
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </Card>

      <Card className="h-fit">
        <p className="mb-4 text-sm font-medium text-zinc-900">Aperçu</p>
        <div className="flex items-center gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local ou logo Supabase
            <img src={preview} alt="" className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <span
              style={{ backgroundColor: color, color: contrastColor(color) }}
              className="flex h-10 w-10 items-center justify-center rounded-lg font-semibold"
            >
              {initials(name)}
            </span>
          )}
          <span className="font-semibold leading-tight text-zinc-900">{name || "Nom de l'organisme"}</span>
        </div>
        <span
          style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
          className="relative mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-900"
        >
          <span aria-hidden style={{ backgroundColor: color }} className="absolute inset-y-2 left-0 w-1 rounded-full" />
          <ImagePlus className="h-5 w-5" aria-hidden /> Menu actif
        </span>
        <p className="mt-4 text-xs text-zinc-600">L&apos;aperçu se met à jour pendant la saisie. Rien n&apos;est appliqué avant « Enregistrer ».</p>
      </Card>
    </div>
  );
}
