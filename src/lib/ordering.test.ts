import { describe, expect, it } from "vitest";
import { isDirection, moveItem } from "./ordering";

describe("déplacement d'un élément", () => {
  const list = ["a", "b", "c"];

  it("monte et descend d'un cran", () => {
    expect(moveItem(list, 1, "up")).toEqual(["b", "a", "c"]);
    expect(moveItem(list, 1, "down")).toEqual(["a", "c", "b"]);
  });

  it("ne bouge pas aux extrémités ni pour un indice invalide", () => {
    expect(moveItem(list, 0, "up")).toEqual(list);
    expect(moveItem(list, 2, "down")).toEqual(list);
    expect(moveItem(list, 9, "up")).toEqual(list);
    expect(moveItem(list, -1, "down")).toEqual(list);
  });

  it("ne modifie pas la liste d'origine", () => {
    moveItem(list, 0, "down");
    expect(list).toEqual(["a", "b", "c"]);
  });

  it("reconnaît les directions valides", () => {
    expect(isDirection("up")).toBe(true);
    expect(isDirection("sideways")).toBe(false);
  });
});
