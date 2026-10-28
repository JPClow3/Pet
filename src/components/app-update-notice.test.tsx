import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppUpdateNotice } from "@/components/app-update-notice";

const mock = vi.hoisted(() => ({
  pathname: "/pets/new",
  listeners: new Map<string, (event: { isUpdate?: boolean }) => void>(),
  messageSkipWaiting: vi.fn(),
  getRegistration: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => mock.pathname }));
vi.mock("@serwist/turbopack/react", () => ({
  useSerwist: () => ({
    serwist: worker,
  }),
}));

const worker = {
  addEventListener: (
    name: string,
    callback: (event: { isUpdate?: boolean }) => void,
  ) => mock.listeners.set(name, callback),
  removeEventListener: (name: string) => mock.listeners.delete(name),
  messageSkipWaiting: mock.messageSkipWaiting,
};

function emit(name: string, event = {}) {
  act(() => mock.listeners.get(name)?.(event));
}

describe("atualizações seguras da PWA", () => {
  beforeEach(() => {
    mock.pathname = "/pets/new";
    mock.listeners.clear();
    mock.messageSkipWaiting.mockReset();
    mock.getRegistration.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: mock.getRegistration },
    });
  });

  it("espera uma ação explícita antes de ativar e outra antes de reabrir", async () => {
    const user = userEvent.setup();
    render(<AppUpdateNotice />);
    emit("waiting");
    expect(mock.messageSkipWaiting).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Preparar atualização" }),
    );
    expect(mock.messageSkipWaiting).toHaveBeenCalledOnce();
    emit("controlling", { isUpdate: true });
    expect(
      screen.getByRole("button", { name: "Reabrir versão atualizada" }),
    ).toBeEnabled();
  });

  it("detecta atualizações que já estavam esperando antes da montagem", async () => {
    mock.getRegistration.mockResolvedValue({ waiting: {} });
    render(<AppUpdateNotice />);
    expect(
      await screen.findByRole("button", { name: "Preparar atualização" }),
    ).toBeEnabled();
  });

  it("preserva campos editados ao receber atualização ou reconectar", async () => {
    const user = userEvent.setup();
    const view = render(
      <>
        <input aria-label="Nome do pet" />
        <AppUpdateNotice />
      </>,
    );
    await user.type(screen.getByLabelText("Nome do pet"), "Luna");
    emit("waiting");
    fireEvent(window, new Event("online"));
    expect(screen.getByLabelText("Nome do pet")).toHaveValue("Luna");
    expect(
      screen.getByRole("button", { name: "Preparar atualização" }),
    ).toBeDisabled();
    expect(mock.messageSkipWaiting).not.toHaveBeenCalled();
    mock.pathname = "/pets";
    view.rerender(
      <>
        <input aria-label="Nome do pet" />
        <AppUpdateNotice />
      </>,
    );
    expect(
      screen.getByRole("button", { name: "Preparar atualização" }),
    ).toBeEnabled();
  });

  it("não mostra atualização na primeira instalação e remove listeners", async () => {
    const view = render(<AppUpdateNotice />);
    emit("controlling", { isUpdate: false });
    await waitFor(() => expect(mock.getRegistration).toHaveBeenCalled());
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    view.unmount();
    expect(mock.listeners.size).toBe(0);
  });
});
