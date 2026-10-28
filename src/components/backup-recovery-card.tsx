"use client";

import { useRouter } from "next/navigation";
import { BackupPanel } from "./backup-panel";
import { Card, CardTitle } from "./ui/card";

export function BackupRecoveryCard() {
  const router = useRouter();
  return (
    <Card id="restore-backup" className="flex scroll-mt-6 flex-col gap-4">
      <CardTitle>Backup em arquivo</CardTitle>
      <p className="text-sm text-muted">
        Já tem um backup? Restaure seu espaço aqui, sem criar uma conta.
        Arquivos das versões anteriores também são aceitos.
      </p>
      <BackupPanel onRestored={() => router.replace("/")} />
    </Card>
  );
}
