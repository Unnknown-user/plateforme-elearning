import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Page d'accueil", () => {
  it("affiche le titre de la plateforme", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Plateforme e-learning" })).toBeInTheDocument();
  });
});
