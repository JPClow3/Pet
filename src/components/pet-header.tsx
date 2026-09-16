"use client";

import { ChevronDown, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CareHalo, PetAvatar } from "@/components/pet-avatar";
import { Chip } from "@/components/ui/chip";
import { BottomSheet } from "@/components/ui/sheet";
import { speciesLabels } from "@/lib/domain/labels";
import type { Pet } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";
import { usePetRecords, useReminderItems } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export type PetScope = "todos" | string;

type PetContextSwitcherProps = {
  pets?: Pet[];
  scope?: PetScope;
  allowAll?: boolean;
  showAvatar?: boolean;
  onScopeChange?: (scope: PetScope) => void;
  className?: string;
};

/**
 * Shared pet context control for Today, Agenda, and pet-specific screens.
 * A context change updates the local active pet and optionally the screen's
 * aggregate scope. Attention counts remain visible in the choice sheet.
 */
export function PetContextSwitcher({
  pets: providedPets,
  scope,
  allowAll = false,
  showAvatar = true,
  onScopeChange,
  className,
}: PetContextSwitcherProps) {
  const pets = useAppStore((state) => providedPets ?? state.pets);
  const activePetId = useAppStore((state) => state.activePetId);
  const setActivePet = useAppStore((state) => state.setActivePet);
  const items = useReminderItems();
  const [open, setOpen] = useState(false);

  const selectedScope = scope ?? activePetId ?? pets[0]?.id ?? "todos";
  const selectedPet =
    pets.find(
      (pet) =>
        pet.id === (selectedScope === "todos" ? activePetId : selectedScope),
    ) ??
    pets[0] ??
    null;
  const selectedLabel =
    selectedScope === "todos"
      ? "Todos os pets"
      : pets.find((pet) => pet.id === selectedScope)?.name;
  const totalAttention = useMemo(
    () =>
      items.filter(
        (item) => item.urgency === "vencido" || item.urgency === "hoje",
      ).length,
    [items],
  );

  function choose(nextScope: PetScope) {
    if (nextScope !== "todos") setActivePet(nextScope);
    onScopeChange?.(nextScope);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "group inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line/80 bg-white px-2.5 pr-3 text-left transition-colors hover:bg-surface",
          className,
        )}
      >
        {showAvatar ? (
          selectedScope === "todos" ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-mint text-[0.78rem] font-bold text-teal-ink">
              {pets.length}
            </span>
          ) : selectedPet ? (
            <PetAvatar pet={selectedPet} size="sm" />
          ) : (
            <span
              className="size-8 rounded-full bg-surface"
              aria-hidden="true"
            />
          )
        ) : null}
        <span className="min-w-0 truncate whitespace-nowrap text-[0.9rem] font-semibold text-ink">
          {selectedLabel ?? "Escolher pet"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted transition-transform group-aria-expanded:rotate-180"
        />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Escolher contexto"
        description="Seu pet ativo acompanha os registros. Na agenda, você também pode ver todos juntos."
      >
        <div className="flex flex-col gap-2">
          {allowAll ? (
            <button
              type="button"
              onClick={() => choose("todos")}
              aria-current={selectedScope === "todos" ? "true" : undefined}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-2xl border px-3 text-left transition-colors",
                selectedScope === "todos"
                  ? "border-teal-ink bg-mint text-teal-ink"
                  : "border-line bg-white text-ink-soft hover:bg-surface",
              )}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-surface text-xs font-bold text-teal-ink">
                {pets.length}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  Todos os pets
                </span>
                <span className="block text-meta text-muted">
                  {totalAttention === 0
                    ? "Nenhum cuidado vencido ou de hoje"
                    : `${totalAttention} cuidado${totalAttention === 1 ? "" : "s"} pedindo atenção`}
                </span>
              </span>
              {selectedScope === "todos" ? (
                <Chip tone="teal">Ativo</Chip>
              ) : null}
            </button>
          ) : null}

          {pets.map((pet) => {
            const attention = items.filter(
              (item) =>
                item.petId === pet.id &&
                (item.urgency === "vencido" || item.urgency === "hoje"),
            ).length;
            const selected = selectedScope === pet.id;
            return (
              <button
                key={pet.id}
                type="button"
                onClick={() => choose(pet.id)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-2xl border px-3 text-left transition-colors",
                  selected
                    ? "border-teal-ink bg-mint text-teal-ink"
                    : "border-line bg-white text-ink-soft hover:bg-surface",
                )}
              >
                <PetAvatar pet={pet} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">
                    {pet.name}
                  </span>
                  <span className="block text-meta text-muted">
                    {speciesLabels[pet.species]}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                  </span>
                </span>
                {attention > 0 ? (
                  <Chip tone="warning">
                    {attention} {attention === 1 ? "atenção" : "atenções"}
                  </Chip>
                ) : selected ? (
                  <Chip tone="teal">Ativo</Chip>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/pets/new"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-line bg-white px-3 text-[0.85rem] font-semibold text-ink transition-colors hover:bg-surface"
          >
            <Plus aria-hidden="true" className="size-4" />
            Adicionar pet
          </Link>
          <Link
            href="/pets"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-mint px-3 text-[0.85rem] font-semibold text-teal-ink transition-colors hover:bg-mint/70"
          >
            <Settings2 aria-hidden="true" className="size-4" />
            Gerenciar pets
          </Link>
        </div>
      </BottomSheet>
    </>
  );
}

export function PetHeader({
  pet,
  headline,
  compact = false,
}: {
  pet: Pet;
  headline: string;
  compact?: boolean;
}) {
  const records = usePetRecords(pet.id);

  return (
    <header className={cn("flex flex-col gap-3", compact ? "mb-2" : "mb-5")}>
      <div className="flex items-center gap-3">
        <CareHalo
          pet={pet}
          records={records}
          size={compact ? "md" : "lg"}
          label={`Agenda de cuidados de ${pet.name}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-meta text-muted">{greeting()}</p>
          <PetContextSwitcher
            showAvatar={false}
            className="-ml-2 max-w-full border-transparent bg-transparent px-2 hover:bg-surface"
          />
          <p className="truncate text-meta text-muted">
            {speciesLabels[pet.species]}
            {pet.breed ? ` · ${pet.breed}` : ""}
          </p>
        </div>
        <Link
          href={`/pets/${pet.id}/card`}
          className="flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-line bg-white text-ink transition-colors hover:bg-surface"
          aria-label={`Abrir carteirinha de ${pet.name}`}
        >
          <span
            aria-hidden="true"
            className="text-[0.7rem] font-bold leading-none"
          >
            QR
          </span>
        </Link>
      </div>

      <p
        className={cn(
          "max-w-[54ch] text-[1rem] font-medium leading-relaxed text-ink",
          compact && "sr-only",
        )}
      >
        {headline}
      </p>
    </header>
  );
}
