import { render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StoreProvider } from "@/components/store-provider";
import { resetLocalDataForRecovery, useAppStore } from "@/lib/store/app-store";
import { clearStorageRecoveryError, STORAGE_KEY } from "@/lib/store/storage";
import {
  replaceStoredSnapshot,
  storedSnapshot,
} from "@/lib/store/test-support";

const navigation = vi.hoisted(() => ({
  pathname: "/onboarding",
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

function ChildWithMountEffect({ onMount }: { onMount: () => void }) {
  useEffect(onMount, [onMount]);
  return <p>Conteúdo da página</p>;
}

describe("proteção dos dados durante a hidratação", () => {
  beforeEach(async () => {
    clearStorageRecoveryError();
    localStorage.clear();
    await resetLocalDataForRecovery();
    await useAppStore.setState({ ready: false });
    navigation.pathname = "/onboarding";
    navigation.replace.mockClear();
    vi.spyOn(useAppStore.persist, "hasHydrated").mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearStorageRecoveryError();
  });

  it("lê o perfil salvo antes de montar um filho que grava eventos", async () => {
    await useAppStore.getState().completeOnboarding({
      tutorName: "Ana",
      email: null,
      city: "São Paulo",
      focusAreas: ["saude"],
      pet: { name: "Luna", species: "cao", sex: "nao_informado" },
    });
    const saved = await storedSnapshot();
    await resetLocalDataForRecovery();
    await useAppStore.setState({ ready: false });
    await replaceStoredSnapshot(saved);
    clearStorageRecoveryError();

    const writeFromChild = vi.fn(() => {
      void useAppStore.getState().track("onboarding_started");
    });
    render(
      <StoreProvider>
        <ChildWithMountEffect onMount={writeFromChild} />
      </StoreProvider>,
    );

    expect(await screen.findByText("Conteúdo da página")).toBeInTheDocument();
    expect(writeFromChild).toHaveBeenCalledOnce();
    expect(useAppStore.getState().tutor?.name).toBe("Ana");
    expect(useAppStore.getState().pets[0].name).toBe("Luna");
    await waitFor(() =>
      expect(
        useAppStore
          .getState()
          .events.some((event) => event.name === "onboarding_started"),
      ).toBe(true),
    );
    expect((await storedSnapshot())?.state).toMatchObject({
      pets: [{ name: "Luna" }],
    });
  });

  it("preserva dados corrompidos e não monta o filho privado", async () => {
    const original = '{"version":1,"state":invalid-json';
    localStorage.setItem(STORAGE_KEY, original);
    const onMount = vi.fn(() =>
      useAppStore.getState().track("onboarding_started"),
    );
    render(
      <StoreProvider>
        <ChildWithMountEffect onMount={onMount} />
      </StoreProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Vamos recuperar seus dados",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo da página")).not.toBeInTheDocument();
    expect(onMount).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("permite abrir carteirinha pública sem hidratar ou alterar os dados locais", () => {
    navigation.pathname = "/p/example-code";
    const original = "corrupted-private-store";
    localStorage.setItem(STORAGE_KEY, original);
    const hydrate = vi.spyOn(useAppStore.persist, "rehydrate");
    const onMount = vi.fn();
    render(
      <StoreProvider>
        <ChildWithMountEffect onMount={onMount} />
      </StoreProvider>,
    );

    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
    expect(onMount).toHaveBeenCalledOnce();
    expect(hydrate).not.toHaveBeenCalled();
    expect(useAppStore.getState().ready).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });
});
