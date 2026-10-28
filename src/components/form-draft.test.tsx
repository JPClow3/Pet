import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useAppStore } from "@/lib/store/app-store";
import { abortNextSnapshotWrite } from "@/lib/store/test-support";
import {
  clearFormDrafts,
  FORM_DRAFT_PREFIX,
  useFormDraft,
} from "@/lib/use-form-draft";

const schema = z.object({ text: z.string().max(100) });
const initialValue = { text: "" };

describe("rascunhos da sessão", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("limpa apenas rascunhos Zelupi ao trocar os dados do aparelho", () => {
    sessionStorage.setItem(`${FORM_DRAFT_PREFIX}onboarding`, "{}");
    sessionStorage.setItem(`${FORM_DRAFT_PREFIX}pet:a`, "{}");
    sessionStorage.setItem("other-app", "preservar");
    clearFormDrafts();
    expect(sessionStorage.getItem(`${FORM_DRAFT_PREFIX}onboarding`)).toBeNull();
    expect(sessionStorage.getItem(`${FORM_DRAFT_PREFIX}pet:a`)).toBeNull();
    expect(sessionStorage.getItem("other-app")).toBe("preservar");
  });

  it("preserva os rascunhos se a exclusão dos dados falha ao persistir", async () => {
    sessionStorage.setItem(`${FORM_DRAFT_PREFIX}pet:a`, "rascunho preservado");
    abortNextSnapshotWrite();
    await expect(useAppStore.getState().resetAll()).rejects.toThrow();
    expect(sessionStorage.getItem(`${FORM_DRAFT_PREFIX}pet:a`)).toBe(
      "rascunho preservado",
    );
    await useAppStore.getState().resetAll();
    expect(sessionStorage.getItem(`${FORM_DRAFT_PREFIX}pet:a`)).toBeNull();
  });

  it("isola os dados por pet e não restaura dados com schema inválido", async () => {
    sessionStorage.setItem(
      `${FORM_DRAFT_PREFIX}pet:a`,
      JSON.stringify({ text: "Luna" }),
    );
    sessionStorage.setItem(
      `${FORM_DRAFT_PREFIX}pet:b`,
      JSON.stringify({ text: 123 }),
    );
    const { result, rerender } = renderHook(
      ({ scope }) => useFormDraft({ key: scope, schema, initialValue }),
      { initialProps: { scope: "pet:a" } },
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.value.text).toBe("Luna");
    rerender({ scope: "pet:b" });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.value.text).toBe("");
    expect(result.current.storageError).toMatch(/não pôde ser recuperado/);
    expect(sessionStorage.getItem(`${FORM_DRAFT_PREFIX}pet:a`)).toContain(
      "Luna",
    );
  });

  it("mantém o texto editável quando a cota impede guardar o rascunho", async () => {
    const { result } = renderHook(() =>
      useFormDraft({ key: "blocked", schema, initialValue }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota", "QuotaExceededError");
    });
    act(() => result.current.setValue({ text: "Informação importante" }));
    await waitFor(() =>
      expect(result.current.storageError).toMatch(/Não foi possível guardar/),
    );
    expect(result.current.value.text).toBe("Informação importante");
  });
});
