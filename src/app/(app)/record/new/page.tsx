"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { PetAvatar } from "@/components/pet-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HEALTH_TYPES, healthTypeMeta } from "@/lib/domain/labels";
import { healthTypeIcons } from "@/lib/icons";
import type { HealthRecordType } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

export default function QuickRecordPage() {
  const ready = useHydrated();
  const pets = useAppStore((state) => state.pets);
  const activePetId = useAppStore((state) => state.activePetId);
  const setActivePet = useAppStore((state) => state.setActivePet);
  const router = useRouter();

  if (!ready) return null;

  if (pets.length === 0) {
    return (
      <EmptyState
        title="Cadastre um pet primeiro"
        description="Os registros pertencem sempre a um pet."
        action={
          <Button onClick={() => router.push("/pets/new")}>
            Criar perfil do pet
          </Button>
        }
      />
    );
  }

  const pet = pets.find((item) => item.id === activePetId) ?? pets[0];

  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageHeader
        title="Novo registro"
        subtitle="O que aconteceu com seu pet?"
        backHref="/"
      />

      {pets.length > 1 ? (
        <Card className="flex flex-col gap-2">
          <p className="text-[0.85rem] font-medium text-ink">Para qual pet?</p>
          <div className="flex flex-wrap gap-2">
            {pets.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === pet.id}
                onClick={() => setActivePet(item.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[0.9rem] font-medium ${
                  item.id === pet.id
                    ? "border-teal-ink bg-mint text-teal-ink"
                    : "border-line bg-white text-ink-soft"
                }`}
              >
                <PetAvatar pet={item} size="sm" />
                {item.name}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {HEALTH_TYPES.map((type: HealthRecordType) => {
          const Icon = healthTypeIcons[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() =>
                router.push(`/pets/${pet.id}/health/new?type=${type}`)
              }
              className="flex min-h-20 flex-col items-start justify-center gap-1.5 rounded-3xl border border-line bg-white p-4 text-left hover:bg-surface"
            >
              <Icon aria-hidden="true" className="size-5 text-teal-ink" />
              <span className="text-[0.92rem] font-medium text-ink">
                {healthTypeMeta[type].label}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        variant="secondary"
        onClick={() => router.push(`/pets/${pet.id}/diary`)}
      >
        Guardar um momento no diário
      </Button>
    </div>
  );
}
