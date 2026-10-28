"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SetStateAction,
} from "react";
import type { ZodType } from "zod";

export const FORM_DRAFT_PREFIX = "pethub:draft:v1:";

/** Remove this tab's private drafts and public bearer links after replacing device data. */
export function clearFormDrafts() {
  if (typeof window === "undefined") return;
  try {
    const keys = Array.from(
      { length: window.sessionStorage.length },
      (_, index) => window.sessionStorage.key(index),
    );
    for (const key of keys) {
      if (
        key?.startsWith(FORM_DRAFT_PREFIX) ||
        key?.startsWith("pethub:card-token:")
      )
        window.sessionStorage.removeItem(key);
    }
  } catch {
    // A blocked storage API must not turn an already committed restore into an error.
  }
}

/** Text-only drafts live in this tab, never in a shared account or backup. */
export function useFormDraft<T>({
  key,
  schema,
  initialValue,
  enabled = true,
}: {
  key: string;
  schema: ZodType<T>;
  initialValue: T;
  enabled?: boolean;
}) {
  const storageKey = `${FORM_DRAFT_PREFIX}${key}`;
  const [state, setState] = useState({
    key: storageKey,
    value: initialValue,
    loaded: false,
    restored: false,
    error: null as string | null,
    cleared: null as string | null,
  });
  const value = state.key === storageKey ? state.value : initialValue;
  const serialized = useMemo(() => JSON.stringify(value), [value]);
  const initialSerialized = useMemo(
    () => JSON.stringify(initialValue),
    [initialValue],
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let nextValue = initialValue;
    let restored = false;
    let error: string | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed =
          raw.length <= 100_000 ? schema.safeParse(JSON.parse(raw)) : null;
        if (parsed?.success) {
          nextValue = parsed.data;
          restored = true;
        } else {
          sessionStorage.removeItem(storageKey);
          error =
            "O rascunho anterior não pôde ser recuperado. Preencha novamente.";
        }
      }
    } catch {
      error =
        "O navegador não permitiu recuperar o rascunho. Mantenha esta tela aberta.";
    }
    queueMicrotask(() => {
      if (!cancelled)
        setState({
          key: storageKey,
          value: nextValue,
          loaded: true,
          restored,
          error,
          cleared: null,
        });
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, schema, initialValue, enabled]);

  useEffect(() => {
    if (
      !enabled ||
      !state.loaded ||
      state.key !== storageKey ||
      state.cleared === serialized
    )
      return;
    try {
      if (serialized === initialSerialized)
        sessionStorage.removeItem(storageKey);
      else if (serialized.length <= 100_000 && schema.safeParse(value).success)
        sessionStorage.setItem(storageKey, serialized);
    } catch {
      queueMicrotask(() =>
        setState((current) =>
          current.key === storageKey
            ? {
                ...current,
                error:
                  "Não foi possível guardar o rascunho. Mantenha esta tela aberta até salvar.",
              }
            : current,
        ),
      );
    }
  }, [
    enabled,
    state.loaded,
    state.key,
    state.cleared,
    storageKey,
    serialized,
    initialSerialized,
    schema,
    value,
  ]);

  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      setState((current) => {
        const previous =
          current.key === storageKey ? current.value : initialValue;
        const resolved =
          typeof next === "function"
            ? (next as (value: T) => T)(previous)
            : next;
        return { ...current, key: storageKey, value: resolved };
      });
    },
    [storageKey, initialValue],
  );

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* The form remains usable when storage is blocked. */
    }
    setState((current) => ({
      ...current,
      restored: false,
      cleared: JSON.stringify(current.value),
    }));
  }, [storageKey]);

  return {
    value,
    setValue,
    restored: state.key === storageKey && state.restored,
    storageError: state.key === storageKey ? state.error : null,
    ready: enabled && state.key === storageKey && state.loaded,
    clearDraft,
  };
}
