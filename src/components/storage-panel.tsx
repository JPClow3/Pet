"use client";

import { useEffect, useRef, useState } from "react";
import { HardDrive, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

type Persistence =
  "checking" | "available" | "granted" | "denied" | "unsupported" | "error";
type StorageInfo = {
  estimate: StorageEstimate | null;
  estimateStatus: "loading" | "ready" | "unsupported" | "error";
  persistence: Persistence;
  canRequest: boolean;
};

async function readStorageInfo(): Promise<StorageInfo> {
  const manager = navigator.storage;
  const [estimate, persisted] = await Promise.allSettled([
    Promise.resolve().then(() =>
      typeof manager?.estimate === "function" ? manager.estimate() : null,
    ),
    Promise.resolve().then(() =>
      typeof manager?.persisted === "function" ? manager.persisted() : null,
    ),
  ]);
  const canRequest = typeof manager?.persist === "function";
  return {
    estimate: estimate.status === "fulfilled" ? estimate.value : null,
    estimateStatus:
      estimate.status === "rejected"
        ? "error"
        : estimate.value
          ? "ready"
          : "unsupported",
    persistence:
      persisted.status === "rejected"
        ? "error"
        : persisted.value === true
          ? "granted"
          : canRequest
            ? "available"
            : "unsupported",
    canRequest,
  };
}

function validBytes(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(
    Math.floor(Math.log2(Math.max(value, 1)) / 10),
    units.length - 1,
  );
  return `${(value / 1024 ** unit).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

const persistenceMessages: Record<Persistence, string> = {
  checking: "Consultando proteção do armazenamento…",
  available:
    "Você pode pedir ao navegador para proteger estes dados contra remoção automática por falta de espaço.",
  granted:
    "Armazenamento persistente autorizado pelo navegador. Isso não impede que você apague os dados manualmente nem substitui um backup.",
  denied:
    "O navegador não autorizou armazenamento persistente. Seus dados continuam salvos; mantenha uma cópia fora deste navegador.",
  unsupported:
    "Este navegador não oferece a solicitação de armazenamento persistente. Mantenha uma cópia fora dele.",
  error:
    "Não foi possível verificar a proteção do armazenamento. Tente novamente e mantenha seu backup atualizado.",
};

export function StoragePanel({ documentsHref }: { documentsHref?: string }) {
  const [info, setInfo] = useState<StorageInfo>({
    estimate: null,
    estimateStatus: "loading",
    persistence: "checking",
    canRequest: false,
  });
  const [pending, setPending] = useState<"refresh" | "persist" | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let current = true;
    void readStorageInfo().then((value) => {
      if (current) setInfo(value);
    });
    return () => {
      current = false;
    };
  }, []);

  const usage = validBytes(info.estimate?.usage);
  const quota = validBytes(info.estimate?.quota);
  const percentage =
    usage !== null && quota !== null && quota > 0
      ? Math.min(100, Math.round((usage / quota) * 100))
      : null;

  return (
    <Card className="flex flex-col gap-3" aria-labelledby="storage-heading">
      <CardTitle id="storage-heading" className="flex items-center gap-2">
        <HardDrive
          aria-hidden="true"
          className="size-4 shrink-0 text-teal-ink"
        />
        Espaço neste navegador
      </CardTitle>
      <div aria-live="polite" className="flex flex-col gap-2">
        {info.estimateStatus === "loading" ? (
          <p className="text-sm text-muted">Consultando espaço…</p>
        ) : info.estimateStatus === "ready" ? (
          <>
            <p className="text-sm font-medium text-ink">
              {usage === null
                ? "Uso não informado"
                : `${formatBytes(usage)} usados`}
              {quota === null
                ? " · limite não informado"
                : ` de aproximadamente ${formatBytes(quota)}`}
            </p>
            {percentage !== null ? (
              <progress
                value={percentage}
                max={100}
                aria-label="Uso aproximado do armazenamento"
                className="h-2 w-full overflow-hidden rounded-full accent-teal-ink"
              />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">
            {info.estimateStatus === "unsupported"
              ? "A estimativa de espaço não está disponível neste navegador."
              : "Não foi possível consultar o espaço. Tente atualizar a estimativa."}
          </p>
        )}
        <p className="text-meta text-muted">
          Estimativa do espaço usado pela Zelupi neste aparelho, incluindo fotos
          e documentos. O limite pode mudar.
        </p>
        <p className="text-sm text-ink-soft">
          {persistenceMessages[info.persistence]}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending !== null || info.estimateStatus === "loading"}
          onClick={() => {
            if (busy.current) return;
            busy.current = true;
            setPending("refresh");
            void readStorageInfo()
              .then(setInfo)
              .finally(() => {
                busy.current = false;
                setPending(null);
              });
          }}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {pending === "refresh" ? "Atualizando…" : "Atualizar estimativa"}
        </Button>
        {info.canRequest && info.persistence !== "granted" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending !== null}
            onClick={async () => {
              if (busy.current) return;
              busy.current = true;
              setPending("persist");
              try {
                const granted = await navigator.storage.persist();
                setInfo((value) => ({
                  ...value,
                  persistence: granted ? "granted" : "denied",
                }));
              } catch {
                setInfo((value) => ({ ...value, persistence: "error" }));
              } finally {
                busy.current = false;
                setPending(null);
              }
            }}
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            {pending === "persist"
              ? "Solicitando…"
              : "Pedir armazenamento persistente"}
          </Button>
        ) : null}
      </div>
      <p className="text-meta text-muted">
        Limites por arquivo: documento 10 MB, backup local 100 MB e cópia na
        nuvem 20 MB. O backup JSON pode ser maior que os arquivos originais.
      </p>
      <p className="text-meta text-muted">
        A lixeira continua ocupando espaço. O app não apaga documentos
        automaticamente para liberar cota.
      </p>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="#local-backup" variant="ghost" size="sm">
          Backup e recuperação
        </ButtonLink>
        <ButtonLink href={documentsHref ?? "/pets"} variant="ghost" size="sm">
          {documentsHref ? "Ver documentos do pet" : "Escolher um pet"}
        </ButtonLink>
        <ButtonLink href="/account" variant="ghost" size="sm">
          Cópia na nuvem
        </ButtonLink>
      </div>
    </Card>
  );
}
