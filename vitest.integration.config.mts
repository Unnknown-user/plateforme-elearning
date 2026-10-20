import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

// Configuration des tests qui parlent à la vraie base Supabase (voir tests/).
// Les clés sont lues dans .env.local, jamais écrites dans le code.
export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts"],
    // Ces tests passent par Internet (Supabase) : 5 s par défaut est parfois trop court.
    testTimeout: 30000,
    hookTimeout: 30000,
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
