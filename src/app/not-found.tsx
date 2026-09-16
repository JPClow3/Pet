import { PawPrint } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <title>Página não encontrada · PetHub</title>
      <PawPrint className="size-12 text-teal-ink" aria-hidden="true" />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
        Caminho não encontrado
      </p>
      <h1 className="font-display text-4xl">Vamos voltar para casa.</h1>
      <p className="text-muted">
        Esta página mudou ou o endereço está incompleto.
      </p>
      <ButtonLink href="/">Ir para Hoje</ButtonLink>
    </main>
  );
}
