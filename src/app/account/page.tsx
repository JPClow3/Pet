import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { CloudAccountPanel } from "@/components/cloud-account-panel";
import { BackupRecoveryCard } from "@/components/backup-recovery-card";
import { ButtonLink } from "@/components/ui/button";
import { isCloudConfigured } from "@/lib/cloud/server-auth";

export const metadata: Metadata = {
  title: "Conta e recuperação",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-5 py-8">
      <ButtonLink href="/" variant="ghost" size="sm" className="self-start">
        Voltar à Zelupi
      </ButtonLink>
      <div>
        <Brand href="/welcome" className="mb-4" />
        <h1 className="font-editorial text-3xl text-ink">
          Seus pets, com você
        </h1>
      </div>
      <CloudAccountPanel
        configured={isCloudConfigured()}
        recoveryToken={token ?? null}
      />
      <BackupRecoveryCard />
    </main>
  );
}
