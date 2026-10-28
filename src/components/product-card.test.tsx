import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductCard } from "@/components/product-card";
import { seedProducts } from "@/lib/domain/seed";

describe("catálogo de demonstração", () => {
  it("não oferece compra em links fictícios e identifica o preço ilustrativo", () => {
    render(
      <ProductCard
        recommendation={{
          product: seedProducts[0],
          reasons: ["Exemplo de compatibilidade"],
          score: 1,
          partnerDistanceKm: 2,
        }}
      />,
    );
    expect(screen.getByText("Produto de demonstração")).toBeInTheDocument();
    expect(screen.getByText(/Preço ilustrativo/)).toBeInTheDocument();
    expect(
      screen.getByText("Compra indisponível nesta prévia"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
