import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingPage from "@/app/onboarding/page";
import { useAppStore } from "@/lib/store/app-store";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

async function reachDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Seu nome"), "Ana");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(),
  );
  await user.type(screen.getByLabelText("Nome do pet"), "Luna");
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("onboarding", () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await useAppStore.setState(useAppStore.getInitialState(), true);
    useAppStore.getState().markReady();
    router.replace.mockClear();
    window.scrollTo = vi.fn();
  });

  it("recupera a etapa e os campos depois de sair da tela", async () => {
    const user = userEvent.setup();
    const view = render(<OnboardingPage />);
    await reachDetails(user);
    await user.type(screen.getByLabelText("Peso"), "12,4");
    view.unmount();
    render(<OnboardingPage />);
    expect(
      await screen.findByText(/Seu rascunho foi recuperado/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Peso")).toHaveValue("12,4");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Um pouco mais sobre Luna." }),
      ).toHaveFocus(),
    );
  });

  it("foca cada etapa e volta do último passo sem criar o perfil", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await reachDetails(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(),
    );
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 0,
      behavior: "instant",
    });
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Um pouco mais sobre Luna." }),
      ).toHaveFocus(),
    );
    expect(useAppStore.getState().tutor).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("a seta do topo volta uma etapa em vez de sair do cadastro", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    expect(
      await screen.findByRole("link", { name: "Voltar para o início" }),
    ).toHaveAttribute("href", "/welcome");
    await reachDetails(user);
    await user.click(
      screen.getByRole("button", {
        name: "Voltar para a etapa anterior: Seu pet",
      }),
    );
    expect(await screen.findByLabelText("Nome do pet")).toHaveValue("Luna");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("não assume uma cidade que o tutor não informou", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await reachDetails(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Criar meu espaço" }));
    await waitFor(() => expect(useAppStore.getState().tutor).not.toBeNull());
    expect(useAppStore.getState().settings.city).toBe("");
    expect(
      useAppStore
        .getState()
        .notifications.some((notification) => notification.kind === "local"),
    ).toBe(false);
  });

  it("guarda peso decimal sem perder a vírgula enquanto digita", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await reachDetails(user);
    await user.type(screen.getByLabelText("Peso"), "12,4");
    expect(screen.getByLabelText("Peso")).toHaveValue("12,4");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Criar meu espaço" }));
    await waitFor(() =>
      expect(useAppStore.getState().pets[0]?.weightKg).toBe(12.4),
    );
  });

  it("pula o cuidado escolhido sem criar um registro incompleto", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);
    await reachDetails(user);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(
      screen.getByRole("button", { name: /Peso\s*Acompanhar uma medida/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Agora não, guardar depois" }),
    );
    await waitFor(() => expect(useAppStore.getState().pets).toHaveLength(1));
    expect(useAppStore.getState().records).toHaveLength(0);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  });
});
