import { describe, expect, it } from "vitest";
import { assertChanged } from "./action-error";

describe("assertChanged", () => {
  it("ne dit rien quand au moins une ligne a été touchée", () => {
    expect(() => assertChanged(null, [{ id: "1" }], "échec")).not.toThrow();
  });

  it("échoue quand la base renvoie une erreur", () => {
    expect(() => assertChanged({ message: "boom" }, null, "échec")).toThrow("échec");
  });

  it("échoue quand aucune ligne n'est touchée (écriture ignorée par les règles d'accès)", () => {
    expect(() => assertChanged(null, [], "échec")).toThrow("échec");
    expect(() => assertChanged(null, null, "échec")).toThrow("échec");
  });
});
