"use client";

import {
  Camera,
  FilePlus2,
  PawPrint,
  Plus,
  Scale,
  Syringe,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BottomSheet } from "@/components/ui/sheet";
import { useActivePet } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

const actionStyles = [
  { icon: Syringe, label: "Registrar cuidado", tone: "bg-mint text-teal-ink" },
  { icon: Scale, label: "Registrar peso", tone: "bg-info-soft text-info-ink" },
  {
    icon: Camera,
    label: "Guardar momento",
    tone: "bg-accent-soft text-accent-ink",
  },
  {
    icon: PawPrint,
    label: "Abrir carteirinha",
    tone: "bg-warning-soft text-warning-ink",
  },
] as const;

/** Contextual quick capture. It stays a button until the user chooses an action. */
export function QuickAddButton({
  href = "/record/new",
  petId,
}: {
  href?: string;
  petId?: string;
}) {
  const pet = useActivePet();
  const [open, setOpen] = useState(false);
  const contextPetId = petId ?? pet?.id ?? null;
  const recordHref =
    href || (contextPetId ? `/pets/${contextPetId}/health/new` : "/record/new");
  const diaryHref = contextPetId ? `/pets/${contextPetId}/diary` : "/pets";
  const cardHref = contextPetId ? `/pets/${contextPetId}/card` : "/pets";

  const actions = [
    { ...actionStyles[0], href: recordHref },
    {
      ...actionStyles[1],
      href: contextPetId
        ? `/pets/${contextPetId}/health/new?type=peso`
        : recordHref,
    },
    { ...actionStyles[2], href: diaryHref },
    { ...actionStyles[3], href: cardHref },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Adicionar registro"
        title="Adicionar registro"
        className="fixed bottom-28 right-3 z-30 inline-flex size-12 items-center justify-center gap-2 rounded-full bg-teal-ink font-semibold text-white shadow-float transition-[background-color,transform] hover:bg-teal-deep active:scale-[0.98] min-[360px]:w-auto min-[360px]:px-4 lg:bottom-8 lg:right-8"
      >
        <Plus aria-hidden="true" className="size-5" />
        <span className="hidden min-[360px]:inline">Adicionar</span>
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={pet ? `O que aconteceu com ${pet.name}?` : "Adicionar ao PetHub"}
        description="Escolha o registro que você quer guardar. Você poderá completar os detalhes depois."
      >
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                onClick={() => setOpen(false)}
                className="group flex min-h-28 flex-col items-start justify-between rounded-[20px] border border-line bg-white p-4 transition-[background-color,transform] hover:bg-surface active:scale-[0.98]"
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-[14px]",
                    action.tone,
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex items-center gap-1 text-[0.88rem] font-semibold text-ink">
                  {action.label}
                  <FilePlus2
                    aria-hidden="true"
                    className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </span>
              </Link>
            );
          })}
        </div>
        <p className="mt-4 text-center text-meta text-muted">
          Registros e fotos ficam salvos neste aparelho.
        </p>
      </BottomSheet>
    </>
  );
}
