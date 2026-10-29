"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";

import { PetAvatar } from "@/components/pet-avatar";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store/app-store";
import type { Pet } from "@/lib/domain/schema";

const PRESET_ACTIONS = [
  { label: "Passeio matinal", icon: "🦮", hint: "Passeio ou caminhada" },
  { label: "Alimentação", icon: "🍲", hint: "Refeição do dia" },
  { label: "Escovação de dentes", icon: "🪥", hint: "Higiene bucal" },
  { label: "Água fresca", icon: "💧", hint: "Troca de água" },
  { label: "Suplemento / Remédio", icon: "💊", hint: "Dose ou vitamina" },
] as const;

export function BatchCareModal({
  open,
  onClose,
  pets,
}: {
  open: boolean;
  onClose: () => void;
  pets: Pet[];
}) {
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>(
    () => pets.map((p) => p.id),
  );
  const [selectedPreset, setSelectedPreset] = useState<string>(
    PRESET_ACTIONS[0].label,
  );
  const [customTitle, setCustomTitle] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setSelectedPetIds(pets.map((p) => p.id));
      setIsCustom(false);
      setCustomTitle("");
    });
    return () => cancelAnimationFrame(frame);
  }, [open, pets]);

  const activeTitle = isCustom ? customTitle.trim() : selectedPreset;

  function togglePet(petId: string) {
    setSelectedPetIds((current) =>
      current.includes(petId)
        ? current.filter((id) => id !== petId)
        : [...current, petId],
    );
  }

  function selectAll() {
    setSelectedPetIds(pets.map((p) => p.id));
  }

  function selectNone() {
    setSelectedPetIds([]);
  }

  async function handleExecute() {
    if (!activeTitle) {
      toast.error("Informe o nome do cuidado compartilhado.");
      return;
    }
    if (selectedPetIds.length === 0) {
      toast.error("Selecione ao menos um pet.");
      return;
    }

    setPending(true);
    try {
      const undoData = await useAppStore.getState().batchRecordCare({
        petIds: selectedPetIds,
        title: activeTitle,
        notes: "Ação em lote aplicada a múltiplos pets",
      });

      const selectedNames = pets
        .filter((p) => selectedPetIds.includes(p.id))
        .map((p) => p.name)
        .join(", ");

      toast.success(`"${activeTitle}" registrado!`, {
        description: `Aplicado para: ${selectedNames}`,
        action: {
          label: "Desfazer",
          onClick: async () => {
            try {
              await useAppStore.getState().undoBatchCare(undoData);
              toast.success("Ação compartilhada desfeita");
            } catch (cause) {
              toast.error(
                cause instanceof Error
                  ? cause.message
                  : "Não foi possível desfazer.",
              );
            }
          },
        },
        duration: 7000,
      });

      onClose();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o cuidado.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Cuidado compartilhado em lote"
      description="Aplique a mesma ação para vários pets de uma só vez com 1 toque."
    >
      <div className="flex flex-col gap-5">
        {/* Presets Grid */}
        <div>
          <label className="text-[0.85rem] font-bold uppercase tracking-wider text-muted">
            1. Escolha o cuidado
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESET_ACTIONS.map((preset) => {
              const selected = !isCustom && selectedPreset === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.label);
                    setIsCustom(false);
                  }}
                  className={`flex flex-col items-start gap-1 rounded-[16px] border p-3 text-left transition-[border-color,background-color] ${
                    selected
                      ? "border-teal-ink bg-mint/55 text-teal-deep font-semibold"
                      : "border-line bg-paper hover:bg-surface/60 text-ink"
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {preset.icon}
                  </span>
                  <span className="text-[0.9rem] leading-tight font-semibold">
                    {preset.label}
                  </span>
                  <span className="text-[11px] text-muted leading-tight">
                    {preset.hint}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`flex flex-col items-start gap-1 rounded-[16px] border p-3 text-left transition-[border-color,background-color] ${
                isCustom
                  ? "border-teal-ink bg-mint/55 text-teal-deep font-semibold"
                  : "border-dashed border-line bg-paper hover:bg-surface/60 text-ink"
              }`}
            >
              <Sparkles aria-hidden="true" className="size-5 text-teal-ink" />
              <span className="text-[0.9rem] leading-tight font-semibold">
                Outro cuidado
              </span>
              <span className="text-[11px] text-muted leading-tight">
                Personalizado
              </span>
            </button>
          </div>

          {isCustom ? (
            <div className="mt-2">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ex.: Banho de sol, Petisco especial..."
                maxLength={60}
                autoFocus
                className="min-h-11 w-full rounded-[14px] border border-line bg-paper px-3.5 text-base text-ink placeholder:text-muted focus:border-teal-ink focus:outline-none"
              />
            </div>
          ) : null}
        </div>

        {/* Pet Selection */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[0.85rem] font-bold uppercase tracking-wider text-muted">
              2. Selecione os pets ({selectedPetIds.length} de {pets.length})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-meta font-semibold text-teal-ink hover:underline"
              >
                Todos
              </button>
              <span className="text-line" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                onClick={selectNone}
                className="text-meta font-semibold text-muted hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pets.map((pet) => {
              const checked = selectedPetIds.includes(pet.id);
              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => togglePet(pet.id)}
                  aria-pressed={checked}
                  className={`flex items-center justify-between gap-3 rounded-[16px] border p-2.5 text-left transition-colors ${
                    checked
                      ? "border-teal-ink/60 bg-mint/30"
                      : "border-line bg-paper opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PetAvatar pet={pet} size="sm" />
                    <div>
                      <p className="font-semibold text-ink text-[0.92rem]">
                        {pet.name}
                      </p>
                      <p className="text-meta text-muted capitalize">
                        {pet.species === "cao"
                          ? "Cão"
                          : pet.species === "gato"
                            ? "Gato"
                            : "Pet"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`flex size-6 items-center justify-center rounded-full border transition-colors ${
                      checked
                        ? "border-teal-ink bg-teal-ink text-white"
                        : "border-line bg-surface text-transparent"
                    }`}
                  >
                    <Check aria-hidden="true" className="size-3.5 stroke-[3]" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            size="lg"
            className="w-full"
            disabled={pending || selectedPetIds.length === 0 || !activeTitle}
            onClick={handleExecute}
          >
            <CheckCheck aria-hidden="true" className="size-5" />
            {pending
              ? "Registrando…"
              : `Registrar "${activeTitle}" para ${selectedPetIds.length} ${
                  selectedPetIds.length === 1 ? "pet" : "pets"
                }`}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
