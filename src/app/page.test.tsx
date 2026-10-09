import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Page d'accueil publique", () => {
  it("présente la promesse principale", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Votre plateforme de formation, à votre image.");
  });

  it("propose d'accéder à l'espace de connexion", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: "Accéder à mon espace" });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/login"));
  });

  it("propose de demander une démonstration par e-mail", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: "Demander une démonstration" });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link.getAttribute("href")).toMatch(/^mailto:.+\?subject=/));
  });

  it("indique que les données sont fictives", () => {
    render(<Home />);
    expect(screen.getByText(/données présentées sont fictives/i)).toBeInTheDocument();
  });
});
