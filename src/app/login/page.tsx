"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: null });

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Connexion</h1>
        <label className="block text-sm">
          E-mail
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.email}
            key={state.email}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block text-sm">
          Mot de passe
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-blue-700 p-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
