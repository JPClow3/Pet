"use client";

import { RefreshCw, HeartHandshake } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function AppError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <title>Não foi possível abrir · PetHub</title>
      <HeartHandshake className="size-12 text-teal-ink" aria-hidden="true" />
      <h1 className="font-display text-3xl">Vamos tentar de novo?</h1>
      <p className="text-muted">
        Não foi possível abrir esta tela. Seus dados salvos continuam neste
        aparelho.
      </p>
      <Button onClick={retry}>
        <RefreshCw className="size-4" />
        Tentar novamente
      </Button>
      <ButtonLink href="/" variant="ghost">
        Voltar para Hoje
      </ButtonLink>
    </section>
  );
}
