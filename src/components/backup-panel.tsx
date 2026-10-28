"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/sheet";
import { CheckboxRow } from "@/components/ui/field";
import {
  MAX_BACKUP_BYTES,
  parseBackup,
  type Backup,
} from "@/lib/domain/backup";
import { downloadText } from "@/lib/download";
import {
  deviceContentSignature,
  exportSnapshot,
  restoreSnapshot,
} from "@/lib/store/app-store";

export function BackupPanel({
  onRestored,
  recovery = false,
}: {
  onRestored?: () => void;
  recovery?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    backup: Backup;
    text: string;
    localState: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">
        Guarde uma cópia fora deste navegador. O backup inclui pets, fotos,
        saúde, documentos, diário e preferências; mantenha o arquivo em um lugar
        privado.
      </p>
      <div className="flex flex-wrap gap-2">
        {!recovery && (
          <Button
            variant="secondary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                downloadText(
                  await exportSnapshot(),
                  `zelupi-backup-${new Date().toISOString().slice(0, 10)}.json`,
                );
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Não foi possível preparar o backup.",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            <Download aria-hidden="true" className="size-4" />
            Baixar backup
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={reading || saving}
          onClick={() => input.current?.click()}
        >
          <Upload aria-hidden="true" className="size-4" />
          {reading ? "Lendo arquivo…" : "Restaurar backup"}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Arquivo de backup da Zelupi"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setError("");
          setReading(true);
          setConfirmed(false);
          try {
            if (file.size > MAX_BACKUP_BYTES)
              throw new Error("O arquivo excede o limite de 100 MB.");
            const text = await file.text();
            setPreview({
              backup: parseBackup(text),
              text,
              localState: deviceContentSignature(),
            });
          } catch (cause) {
            setPreview(null);
            setError(
              cause instanceof Error
                ? cause.message
                : "Não foi possível ler o arquivo.",
            );
          } finally {
            setReading(false);
          }
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      )}
      <BottomSheet
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Revisar restauração"
        description="Confira a cópia antes de substituir os dados deste aparelho."
      >
        {preview && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              Backup de{" "}
              {new Date(preview.backup.exportedAt).toLocaleString("pt-BR")}
            </p>
            <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 text-sm">
              <dt>Pets</dt>
              <dd>{preview.backup.pets.length}</dd>
              <dt>Registros de saúde</dt>
              <dd>{preview.backup.records.length}</dd>
              <dt>Lembretes</dt>
              <dd>{preview.backup.reminders.length}</dd>
              <dt>Entradas no diário</dt>
              <dd>{preview.backup.diary.length}</dd>
              <dt>Documentos (inclui lixeira)</dt>
              <dd>{preview.backup.documents.length}</dd>
            </dl>
            <p className="text-sm text-muted">
              A restauração substitui a cópia local inteira. Não combina
              arquivos nem duplica registros. Baixe o backup atual antes de
              continuar.
            </p>
            <CheckboxRow
              id="confirm-restore"
              label="Entendi que os dados deste aparelho serão substituídos"
              checked={confirmed}
              onChange={setConfirmed}
            />
            <Button
              disabled={!confirmed || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await restoreSnapshot(preview.text, {
                    recovering: recovery,
                    expectedLocalState: recovery
                      ? undefined
                      : preview.localState,
                  });
                  setPreview(null);
                  setError("");
                  toast.success("Backup restaurado");
                  onRestored?.();
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Não foi possível restaurar.",
                  );
                  setPreview(null);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Restaurar esta cópia
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
