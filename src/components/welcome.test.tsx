import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WelcomePage from "@/app/welcome/page";
import { useAppStore } from "@/lib/store/app-store";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("entrada na Zelupi", () => {
  beforeEach(async () => {
    await useAppStore.setState(useAppStore.getInitialState(), true);
    useAppStore.getState().markReady();
    router.replace.mockClear();
  });

  it("separa começar um perfil local de restaurar os dados existentes", async () => {
    render(<WelcomePage />);
    expect(
      screen.getByRole("link", { name: "Começar com meu pet" }),
    ).toHaveAttribute("href", "/onboarding");
    expect(
      screen.getByRole("link", { name: "Já tenho um backup" }),
    ).toHaveAttribute("href", "/account#restore-backup");
    expect(screen.getByText("Sem conta para começar")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        useAppStore
          .getState()
          .events.some((event) => event.name === "onboarding_started"),
      ).toBe(true),
    );
    expect(useAppStore.getState().tutor).toBeNull();
  });

  it("abre o espaço existente sem pedir que o tutor crie outro perfil", async () => {
    await useAppStore.getState().completeOnboarding({
      tutorName: "Ana",
      email: null,
      city: "São Paulo",
      focusAreas: ["saude"],
      pet: {
        name: "Luna",
        species: "gato",
        sex: "femea",
        birthDate: "2024-01-01",
      },
    });
    const petId = useAppStore.getState().pets[0].id;
    render(<WelcomePage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    await waitFor(() =>
      expect(
        useAppStore
          .getState()
          .events.some((event) => event.name === "onboarding_started"),
      ).toBe(true),
    );
    expect(useAppStore.getState().pets).toHaveLength(1);
    expect(useAppStore.getState().pets[0].id).toBe(petId);
  });
});
