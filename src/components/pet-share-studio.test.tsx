import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PetShareStudio } from "@/components/pet-share-studio";
import type { PublicPetCard } from "@/lib/domain/schema";
import { createPetCardPng, downloadPetCard } from "@/lib/pet-card-export";

vi.mock("@/lib/pet-card-export", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pet-card-export")>(
    "@/lib/pet-card-export",
  );
  return {
    ...actual,
    createPetCardPng: vi
      .fn()
      .mockResolvedValue(new Blob(["png"], { type: "image/png" })),
    downloadPetCard: vi.fn(),
  };
});

const card: PublicPetCard = {
  v: 1,
  name: "Luna",
  species: "gato",
  breed: null,
  city: null,
  lost: null,
  health: null,
  contact: null,
};

describe("PetShareStudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: undefined,
    });
  });

  it("permite escolher os três formatos e personalizar a paleta", async () => {
    const user = userEvent.setup();
    render(
      <PetShareStudio
        card={card}
        photo={null}
        publicUrl="https://pet.test/p/luna"
      />,
    );

    expect(screen.getByRole("radio", { name: /carteira/i })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /quadrado/i }));
    await user.click(screen.getByRole("radio", { name: /amora/i }));

    expect(screen.getByRole("radio", { name: /quadrado/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /amora/i })).toBeChecked();
    await waitFor(() =>
      expect(createPetCardPng).toHaveBeenLastCalledWith(
        expect.objectContaining({ format: "square", theme: "berry" }),
      ),
    );
  });

  it("não mostra no texto acessível dados ausentes do contrato público", async () => {
    render(
      <PetShareStudio
        card={card}
        photo={null}
        publicUrl="https://pet.test/p/luna"
      />,
    );

    const preview = await screen.findByRole("img", {
      name: /preview da carteirinha de luna/i,
    });
    expect(preview).toHaveAccessibleName(/sem contato público/i);
    expect(preview).not.toHaveAccessibleName(/golden|rio verde|microchip/i);
  });

  it("baixa o PNG quando a Web Share API está indisponível", async () => {
    const user = userEvent.setup();
    render(
      <PetShareStudio
        card={card}
        photo={null}
        publicUrl="https://pet.test/p/luna"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /compartilhar imagem/i }),
    );

    await waitFor(() => expect(downloadPetCard).toHaveBeenCalledOnce());
    expect(
      screen.getByText(/compartilhamento direto indisponível/i),
    ).toBeInTheDocument();
  });

  it("só abre o compartilhamento quando o navegador confirma arquivos", async () => {
    const share = vi.fn();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    const user = userEvent.setup();
    render(
      <PetShareStudio
        card={card}
        photo={null}
        publicUrl="https://pet.test/p/luna"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /compartilhar imagem/i }),
    );

    await waitFor(() => expect(downloadPetCard).toHaveBeenCalledOnce());
    expect(share).not.toHaveBeenCalled();
  });

  it("não baixa nem copia quando a pessoa cancela o compartilhamento", async () => {
    const share = vi.fn().mockRejectedValue(
      new DOMException("Compartilhamento cancelado", "AbortError"),
    );
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: vi.fn(() => true),
    });
    const user = userEvent.setup();
    render(
      <PetShareStudio
        card={card}
        photo={null}
        publicUrl="https://pet.test/p/luna"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /compartilhar imagem/i }),
    );

    expect(
      await screen.findByText("Compartilhamento cancelado."),
    ).toBeInTheDocument();
    expect(downloadPetCard).not.toHaveBeenCalled();
    expect(share).toHaveBeenCalledOnce();
  });
});
