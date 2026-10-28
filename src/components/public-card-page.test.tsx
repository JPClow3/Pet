import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicCardPage, { metadata } from "@/app/p/[code]/page";
import { encodePublicCard } from "@/lib/domain/card";
import type { PublicPetCard } from "@/lib/domain/schema";
const managed = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cloud/server-cards", () => ({ readManagedPublicCard: managed }));

const card: PublicPetCard = {
  v: 1,
  generatedAt: "2026-10-25T12:00:00.000Z",
  name: "Luna",
  species: "gato",
  breed: null,
  city: null,
  lost: { since: "2026-10-24", note: null },
  health: { status: "em_dia", nextDueDate: "2026-11-20" },
  contact: null,
};

describe("carteirinha pública", () => {
  beforeEach(() => {
    managed.mockReset();
    managed.mockResolvedValue(null);
  });
  it("lê tokens opacos sem mostrar o aviso de cópia imutável", async () => {
    managed.mockResolvedValue({
      card,
      expiresAt: "2026-11-01T12:00:00Z",
      updatedAt: card.generatedAt,
    });
    render(
      await PublicCardPage({
        params: Promise.resolve({ code: `c_${"A".repeat(43)}` }),
      }),
    );
    expect(screen.getByText(/Publicação atualizada/)).toBeInTheDocument();
    expect(screen.getByText(/Válida até/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Links já enviados continuam acessíveis/),
    ).not.toBeInTheDocument();
  });
  it("não renderiza dados de links revogados ou expirados", async () => {
    render(
      await PublicCardPage({
        params: Promise.resolve({ code: `c_${"A".repeat(43)}` }),
      }),
    );
    expect(screen.getByText("Carteirinha não encontrada")).toBeInTheDocument();
    expect(screen.queryByText("Luna")).not.toBeInTheDocument();
  });
  it("não inclui identidade nos metadados e impede indexação e referrers", () => {
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    });
    expect(metadata.referrer).toBe("no-referrer");
    expect(metadata.title).toBe("Carteirinha compartilhada");
  });

  it("explica a data e o limite do snapshot e orienta quem não tem contato", async () => {
    render(
      await PublicCardPage({
        params: Promise.resolve({ code: encodePublicCard(card) }),
      }),
    );
    expect(
      screen.getByText(/Cópia gerada em 25\/10\/2026.*12:00/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Não é uma avaliação clínica/)).toBeInTheDocument();
    expect(screen.getByText(/Não há contato nesta cópia/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Falar com o tutor" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Links já enviados continuam acessíveis/),
    ).toBeInTheDocument();
  });

  it("mostra contato textual sem criar um link tel vazio", async () => {
    render(
      await PublicCardPage({
        params: Promise.resolve({
          code: encodePublicCard({ ...card, contact: "tutor@example.com" }),
        }),
      }),
    );
    expect(screen.getByText(/tutor@example.com/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Falar com o tutor" }),
    ).not.toBeInTheDocument();
  });

  it("abre telefone válido e mantém a leitura de carteirinhas antigas", async () => {
    const legacy = { ...card, contact: "+55 (11) 99999-1234" };
    delete legacy.generatedAt;
    render(
      await PublicCardPage({
        params: Promise.resolve({ code: encodePublicCard(legacy) }),
      }),
    );
    expect(screen.getByText(/Cópia sem data de geração/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Falar com o tutor" }),
    ).toHaveAttribute("href", "tel:+5511999991234");
  });
});
