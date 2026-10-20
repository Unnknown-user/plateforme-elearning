import { describe, expect, it } from "vitest";
import { validateGroupName } from "./groups-rules";

describe("validateGroupName", () => {
  it("accepte un nom et simplifie les espaces", () => {
    expect(validateGroupName("  Promotion   2026 ")).toEqual({ ok: true, value: "Promotion 2026" });
  });

  it("refuse un nom vide", () => {
    expect(validateGroupName("   ")).toMatchObject({ ok: false });
  });

  it("refuse un nom trop long", () => {
    expect(validateGroupName("x".repeat(81))).toMatchObject({ ok: false });
    expect(validateGroupName("x".repeat(80))).toMatchObject({ ok: true });
  });
});
