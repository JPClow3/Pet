import Link from "next/link";
import { CloudOff } from "lucide-react";

export const metadata = {
  title: "Sem conexão",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex size-16 rotate-[-4deg] items-center justify-center rounded-[1.4rem] bg-sun text-blue-deep shadow-[4px_4px_0_var(--color-blue)]">
        <CloudOff aria-hidden="true" className="size-7" />
      </span>
      <h1 className="text-2xl font-semibold">Você está sem conexão</h1>
      <p className="text-[0.95rem] text-muted">
        Os registros do seu pet ficam salvos neste aparelho. Reabrir o PetHub
        funciona, mas esta página ainda não estava guardada no cache.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-ink px-5 font-medium text-white"
      >
        Tentar novamente
      </Link>
    </main>
  );
}
