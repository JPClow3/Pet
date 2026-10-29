"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { BackupPanel } from "@/components/backup-panel";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";
import {
  exportOriginalDeviceData,
  getStorageRecoveryError,
} from "@/lib/store/storage";

import {
  exportSnapshot,
  resetLocalDataForRecovery,
  seedIfNeeded,
  useAppStore,
} from "@/lib/store/app-store";

export function StoreProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const ready = useAppStore((state) => state.ready);
  const publicPage =
    pathname.startsWith("/p/") ||
    pathname.startsWith("/sitter/") ||
    pathname === "/roadmap";
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [conflict, setConflict] = useState(false);
  useEffect(() => {
    if (publicPage) return;
    let cancelled = false;
    let finished = false;

    const finish = async () => {
      if (cancelled || finished) return;
      finished = true;
      const failure = getStorageRecoveryError();
      if (failure) {
        setError(failure.message);
        return;
      }
      try {
        await seedIfNeeded();
        await useAppStore.getState().sweepNotifications();
        if (cancelled) return;
        useAppStore.getState().markReady();
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível abrir os dados locais.",
        );
      }
    };

    if (useAppStore.persist.hasHydrated() && attempt === 0) {
      void finish();
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = useAppStore.persist.onFinishHydration(finish);
    const hydration = useAppStore.persist.rehydrate();
    void Promise.resolve(hydration).then(finish, finish);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [attempt, publicPage]);

  useEffect(() => {
    const onError = () =>
      toast.error("Não foi possível salvar", {
        description:
          "Libere espaço no navegador e tente novamente. Seus dados anteriores continuam guardados.",
      });
    window.addEventListener("pethub-storage-error", onError);
    return () => window.removeEventListener("pethub-storage-error", onError);
  }, []);

  useEffect(() => {
    const onConflict = () => setConflict(true);
    window.addEventListener("pethub-storage-conflict", onConflict);
    return () =>
      window.removeEventListener("pethub-storage-conflict", onConflict);
  }, []);

  if (error && !publicPage)
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 p-6">
        <h1 className="font-editorial text-3xl text-ink">
          Vamos recuperar seus dados
        </h1>
        <p role="alert" className="text-sm leading-relaxed text-danger-ink">
          {error}
        </p>
        <p className="text-sm text-muted">
          A Zelupi pausou as alterações para proteger a cópia salva. Você pode
          baixar o arquivo original, tentar novamente ou restaurar um backup.
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              downloadText(
                await exportOriginalDeviceData(),
                "zelupi-recuperacao-original.json",
              );
            } catch {
              toast.error("O navegador não permitiu acessar o armazenamento.");
            }
          }}
        >
          Baixar dados originais
        </Button>
        <Button
          variant="secondary"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Tentar novamente
        </Button>
        <BackupPanel
          recovery
          onRestored={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
        />
        <Button
          variant="ghost"
          onClick={async () => {
            if (
              !window.confirm(
                "Apagar a cópia local e começar de novo? Baixe os dados originais antes. Essa ação não pode ser desfeita.",
              )
            )
              return;
            try {
              await resetLocalDataForRecovery();
              setError(null);
              setAttempt((value) => value + 1);
              router.replace("/welcome");
            } catch {
              toast.error("O armazenamento ainda está indisponível.");
            }
          }}
        >
          Apagar dados locais e recomeçar
        </Button>
      </main>
    );

  if (!publicPage && !ready)
    return (
      <main
        className="flex min-h-dvh items-center justify-center p-6"
        role="status"
      >
        <p className="text-sm text-muted">Abrindo seus dados…</p>
      </main>
    );

  return (
    <>
      {conflict && !publicPage ? (
        <aside
          role="alert"
          className="sticky top-0 z-50 border-b border-line bg-surface p-4 text-sm text-ink"
        >
          <p>
            Os dados mudaram em outra aba. Copie o que ainda não salvou no
            formulário antes de atualizar. O download guarda apenas os dados já
            salvos nesta aba.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  downloadText(
                    await exportSnapshot(),
                    "zelupi-copia-desta-aba.json",
                  );
                } catch {
                  toast.error("Não foi possível preparar a cópia desta aba.");
                }
              }}
            >
              Baixar cópia desta aba
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (
                  window.confirm(
                    "Atualizar esta aba? Alterações ainda não salvas serão descartadas.",
                  )
                )
                  window.location.reload();
              }}
            >
              Atualizar esta aba
            </Button>
          </div>
        </aside>
      ) : null}
      {children}
    </>
  );
}
