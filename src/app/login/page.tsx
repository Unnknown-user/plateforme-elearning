"use client";

import { useActionState } from "react";
import { GraduationCap } from "lucide-react";
import { signIn, type LoginState } from "./actions";

const fieldClass = "mt-1 w-full rounded-lg border border-zinc-400 bg-white p-2.5 text-zinc-900";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: null });

  return (
    <main className="grid min-h-screen bg-white md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-gradient-to-br from-blue-800 to-blue-600 p-12 text-white md:flex">
        <span className="flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="h-7 w-7" aria-hidden /> Plateforme e-learning
        </span>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">La formation de vos équipes, à votre image.</h2>
          <p className="mt-3 max-w-md text-blue-100">
            Parcours, quiz et suivi de progression, avec les traces utiles pour vos audits.
          </p>
        </div>
        <span className="text-sm text-blue-100">Prototype de démonstration</span>
      </section>

      <section className="flex items-center justify-center bg-zinc-50 p-6">
        <form action={action} className="w-full max-w-sm space-y-5 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Connexion</h1>
            <p className="mt-1 text-sm text-zinc-600">Accédez à l&apos;espace de votre organisme.</p>
          </div>
          <label className="block text-sm font-medium text-zinc-900">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={state.email}
              key={state.email}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-900">
            Mot de passe
            <input name="password" type="password" required autoComplete="current-password" className={fieldClass} />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-red-700">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-700 p-2.5 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}
