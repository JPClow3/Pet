"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function AppUpdateNotice() {
  const { serwist } = useSerwist();
  const pathname = usePathname();
  const [state, setState] = useState<
    "hidden" | "waiting" | "activating" | "ready"
  >("hidden");
  const [editedPath, setEditedPath] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const hasEdits = editedPath === pathname;

  useEffect(() => {
    const onEdit = (event: Event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.matches("input, textarea, select, [contenteditable='true']")
      ) {
        setEditedPath(pathname);
      }
    };
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    return () => {
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
    };
  }, [pathname]);

  useEffect(() => {
    if (!serwist || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    const waiting = () => setState("waiting");
    const controlling = (event: { isUpdate?: boolean }) => {
      if (event.isUpdate) setState("ready");
    };
    serwist.addEventListener("waiting", waiting);
    serwist.addEventListener("controlling", controlling);
    // The update may already be waiting before this component subscribes.
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (!cancelled && registration?.waiting) setState("waiting");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      serwist.removeEventListener("waiting", waiting);
      serwist.removeEventListener("controlling", controlling);
    };
  }, [serwist]);

  useEffect(() => {
    if (state !== "activating") return;
    const timeout = window.setTimeout(() => {
      setState("waiting");
      setError(true);
    }, 15_000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  if (state === "hidden") return null;

  return (
    <aside
      className="border-b border-line bg-surface px-4 py-3"
      aria-label="Atualização do aplicativo"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="status" className="text-meta leading-relaxed text-ink">
          <p className="font-semibold">
            {state === "ready"
              ? "Nova versão pronta para abrir"
              : "Uma atualização da Zelupi está disponível"}
          </p>
          <p className="text-muted">
            {hasEdits
              ? "Salve suas alterações e vá para outra página antes de atualizar."
              : "Você decide quando reabrir. Seus registros salvos permanecem neste aparelho."}
          </p>
          {error ? (
            <p className="text-danger-ink">
              A atualização não respondeu. Tente novamente quando estiver
              conectado.
            </p>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={hasEdits || state === "activating"}
          onClick={() => {
            if (state === "ready") {
              window.location.reload();
              return;
            }
            setError(false);
            setState("activating");
            serwist?.messageSkipWaiting();
          }}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {state === "ready"
            ? "Reabrir versão atualizada"
            : state === "activating"
              ? "Preparando atualização…"
              : "Preparar atualização"}
        </Button>
      </div>
    </aside>
  );
}
