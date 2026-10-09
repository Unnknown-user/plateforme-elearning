import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

// Configuration des tests qui parlent à la vraie base Supabase (voir tests/).
// Les clés sont lues dans .env.local, jamais écrites dans le code.
export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts"],
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
