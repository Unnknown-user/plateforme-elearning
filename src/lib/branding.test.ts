import { describe, expect, it } from "vitest";
import { contrastColor, isHexColor, validateBranding, validateLogo } from "./branding";

describe("validation du nom et de la couleur", () => {
  it("accepte un nom et une couleur valides, en nettoyant les espaces et la casse", () => {
    const r = validateBranding({ name: "  Institut Horizon  ", color: "#1D4ED8" });
    expect(r).toEqual({ ok: true, value: { name: "Institut Horizon", color: "#1d4ed8" } });
  });

  it("refuse un nom vide ou trop long", () => {
    expect(validateBranding({ name: "   ", color: "#1d4ed8" }).ok).toBe(false);
    expect(validateBranding({ name: "a".repeat(81), color: "#1d4ed8" }).ok).toBe(false);
  });

  it("refuse une couleur qui n'est pas au format #rrggbb (y compris une tentative d'injection)", () => {
    expect(isHexColor("#12345")).toBe(false);
    expect(isHexColor("rouge")).toBe(false);
    expect(isHexColor("#123456; background:url(x)")).toBe(false);
    expect(validateBranding({ name: "OF", color: "red" }).ok).toBe(false);
  });
});

describe("validation du logo", () => {
  it("accepte PNG, JPEG et WebP jusqu'à 1 Mo", () => {
    expect(validateLogo({ type: "image/png", size: 500_000 })).toBeNull();
    expect(validateLogo({ type: "image/jpeg", size: 1_048_576 })).toBeNull();
    expect(validateLogo({ type: "image/webp", size: 10 })).toBeNull();
  });

  it("refuse le SVG, les autres types et les fichiers trop lourds", () => {
    expect(validateLogo({ type: "image/svg+xml", size: 100 })).not.toBeNull();
    expect(validateLogo({ type: "application/pdf", size: 100 })).not.toBeNull();
    expect(validateLogo({ type: "image/png", size: 1_048_577 })).not.toBeNull();
  });
});

describe("lisibilité du texte sur la couleur de l'organisme", () => {
  it("met du texte blanc sur les couleurs foncées et foncé sur les couleurs claires", () => {
    expect(contrastColor("#1d4ed8")).toBe("#ffffff");
    expect(contrastColor("#000000")).toBe("#ffffff");
    expect(contrastColor("#ffffff")).toBe("#171717");
    expect(contrastColor("#fde047")).toBe("#171717");
  });
});

describe("initiales", () => {
  it("prend la première lettre des deux premiers mots", async () => {
    const { initials } = await import("./branding");
    expect(initials("Institut Horizon Formation")).toBe("IH");
    expect(initials("Léa Fontaine")).toBe("LF");
    expect(initials("Horizon")).toBe("H");
    expect(initials("   ")).toBe("?");
  });
});
