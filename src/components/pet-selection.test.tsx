import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuickRecordPage from "@/app/(app)/record/new/page";
import PetRedirectPage from "@/app/(app)/pets/[petId]/page";
import { PetContextSwitcher } from "./pet-header";

const { state, router, toastError } = vi.hoisted(() => ({
  state: {
    pets: [
      { id: "luna", name: "Luna", species: "gato", breed: null },
      { id: "sol", name: "Sol", species: "gato", breed: null },
    ],
    activePetId: "luna",
    setActivePet: vi.fn(),
  },
  router: { push: vi.fn(), replace: vi.fn() },
  toastError: vi.fn(),
}));
vi.mock("@/lib/store/app-store", () => ({
  useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
}));
vi.mock("@/lib/store/hooks", () => ({
  useHydrated: () => true,
  useReminderItems: () => [],
  usePetRecords: () => [],
}));
vi.mock("@/components/pet-avatar", () => ({
  PetAvatar: () => null,
  CareHalo: () => null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useParams: () => ({ petId: "sol" }),
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

describe("seleção de pet após gravação durável", () => {
  beforeEach(() => {
    state.activePetId = "luna";
    state.setActivePet.mockReset();
    router.push.mockReset();
    router.replace.mockReset();
    toastError.mockReset();
  });

  it("não abre um cuidado no pet anterior enquanto a seleção está gravando", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    state.setActivePet.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const view = render(<QuickRecordPage />);
    await user.click(screen.getByRole("button", { name: "Sol" }));
    expect(screen.getByRole("button", { name: "Vacina" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Guardar um momento no diário" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Vacina" }));
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => {
      state.activePetId = "sol";
      resolve();
    });
    view.rerender(<QuickRecordPage />);
    await user.click(screen.getByRole("button", { name: "Vacina" }));
    expect(router.push).toHaveBeenCalledWith(
      "/pets/sol/health/new?type=vacina",
    );
  });

  it("mantém o seletor aberto após falha e só confirma o contexto ao concluir a tentativa", async () => {
    const user = userEvent.setup();
    const onScopeChange = vi.fn();
    let resolve!: () => void;
    state.setActivePet
      .mockRejectedValueOnce(new Error("Sem espaço"))
      .mockImplementationOnce(
        () =>
          new Promise<void>((done) => {
            resolve = done;
          }),
      );
    render(<PetContextSwitcher onScopeChange={onScopeChange} />);
    await user.click(screen.getByRole("button", { name: "Luna" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Sol/ }),
    );
    expect(toastError).toHaveBeenCalledWith("Não foi possível salvar", {
      description: "Sem espaço",
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onScopeChange).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Sol/ }),
    );
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Sol/ }),
    ).toBeDisabled();
    expect(onScopeChange).not.toHaveBeenCalled();
    await act(async () => resolve());
    await waitFor(() => expect(onScopeChange).toHaveBeenCalledWith("sol"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("aguarda a seleção por URL antes de redirecionar para o perfil", async () => {
    let resolve!: () => void;
    state.setActivePet.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    render(<PetRedirectPage />);
    expect(state.setActivePet).toHaveBeenCalledWith("sol");
    expect(router.replace).not.toHaveBeenCalled();
    await act(async () => resolve());
    expect(router.replace).toHaveBeenCalledWith("/pets");
  });

  it("oferece recuperação sem redirecionar quando a seleção por URL falha", async () => {
    const user = userEvent.setup();
    state.setActivePet
      .mockRejectedValueOnce(new Error("Sem espaço"))
      .mockResolvedValueOnce(undefined);
    render(<PetRedirectPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem espaço");
    expect(router.replace).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Tentar selecionar novamente" }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pets"));
  });
});
