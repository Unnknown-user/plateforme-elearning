import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Nettoie l'écran de test entre deux tests (sinon les rendus s'accumulent).
afterEach(() => cleanup());
