import { CloudOff } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "Sem conexão",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-surface-subtle text-teal-ink">
        <CloudOff aria-hidden="true" className="size-7" />
      </span>
      <h1 className="text-2xl font-semibold text-ink">Você está sem conexão</h1>
      <p className="text-[0.95rem] leading-relaxed text-muted">
        Os registros do seu pet ficam salvos neste aparelho. Reabrir o PetHub
        funciona, mas esta página ainda não estava guardada no cache.
      </p>
      <ButtonLink href="/" variant="primary" size="md">
        Tentar novamente
      </ButtonLink>
    </main>
  );
}
