"use client";

import {
  Copy,
  ExternalLink,
  Lock,
  Phone,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { getCloudClient } from "@/lib/cloud/client";
import { createSitterPassCloud } from "@/lib/cloud/collaboration-client";
import {
  sanitizeForSitterView,
  type EmergencyContact,
  type FeedingScheduleItem,
} from "@/lib/domain/collaboration";
import type { HealthRecord, Pet } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";

export function PetSitterConfigModal({
  pet,
  records,
  open,
  onClose,
}: {
  pet: Pet;
  records: HealthRecord[];
  open: boolean;
  onClose: () => void;
}) {
  const client = getCloudClient();
  const { data: session } = client.useSession();
  const user = session?.user;
  const updatePet = useAppStore((state) => state.updatePet);
  const tutor = useAppStore((state) => state.tutor);

  // Form states
  const [sitterName, setSitterName] = useState("");
  const [pin, setPin] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);

  // Emergency contacts
  const [tutorPhone, setTutorPhone] = useState(pet.card?.contact ?? "");
  const [emergencyVetName, setEmergencyVetName] = useState(
    pet.emergencyVet?.name ?? "Clínica Veterinária 24h",
  );
  const [emergencyVetPhone, setEmergencyVetPhone] = useState(
    pet.emergencyVet?.phone ?? "",
  );
  const emergencyClinic = pet.emergencyVet?.clinicName ?? "";
  const [emergencyAddress, setEmergencyAddress] = useState(
    pet.emergencyVet?.address ?? "",
  );

  // Allergies & Special Care
  const [allergiesText, setAllergiesText] = useState(
    (pet.allergies ?? []).join(", "),
  );
  const [specialNotes, setSpecialNotes] = useState("");

  // Feeding routine
  const [feedingItems, setFeedingItems] = useState<FeedingScheduleItem[]>(
    pet.feedingRoutine && pet.feedingRoutine.length > 0
      ? pet.feedingRoutine
      : [
          {
            id: "feed-1",
            time: "08:00",
            description: "Ração Seca",
            amount: "150g",
          },
          {
            id: "feed-2",
            time: "19:00",
            description: "Ração Seca",
            amount: "150g",
          },
        ],
  );

  // Result state
  const [generatedResult, setGeneratedResult] = useState<{
    url: string;
    token: string;
    expiresAt: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addFeedingRow() {
    setFeedingItems((prev) => [
      ...prev,
      {
        id: `feed-${Date.now()}`,
        time: "12:00",
        description: "Alimentação",
        amount: "100g",
      },
    ]);
  }

  function removeFeedingRow(id: string) {
    setFeedingItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Entre na sua conta para criar um link de cuidador.");
      return;
    }
    if (!tutorPhone || tutorPhone.trim().length < 8) {
      toast.error("Informe um telefone de contato do tutor.");
      return;
    }
    if (!emergencyVetPhone || emergencyVetPhone.trim().length < 8) {
      toast.error("Informe o telefone do veterinário de emergência.");
      return;
    }
    if (pin && !/^\d{4,6}$/.test(pin)) {
      toast.error("O PIN deve conter de 4 a 6 números, ou fique em branco.");
      return;
    }

    setSubmitting(true);
    try {
      const parsedAllergies = allergiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const emergencyContact: EmergencyContact = {
        tutorName: tutor?.name?.trim() || "Tutor do Pet",
        tutorPhone: tutorPhone.trim(),
        emergencyVetName: emergencyVetName.trim() || "Veterinário 24h",
        emergencyVetPhone: emergencyVetPhone.trim(),
        emergencyClinicName: emergencyClinic.trim() || null,
        emergencyAddress: emergencyAddress.trim() || null,
        is24h: true,
      };

      // Save to local pet store
      await updatePet(pet.id, {
        allergies: parsedAllergies,
        feedingRoutine: feedingItems,
        emergencyVet: {
          name: emergencyVetName.trim() || "Veterinário 24h",
          phone: emergencyVetPhone.trim(),
          clinicName: emergencyClinic.trim() || null,
          address: emergencyAddress.trim() || null,
          is24h: true,
        },
      }).catch(() => {});

      const passData = sanitizeForSitterView({
        pet,
        records,
        allergies: parsedAllergies,
        specialCareNotes: specialNotes,
        emergencyContact,
        feedingSchedule: feedingItems,
      });

      const { token, url, expiresAt } = await createSitterPassCloud(user.id, {
        petId: pet.id,
        passData,
        pin: pin.trim() || null,
        expiresInDays,
        sitterName: sitterName.trim() || null,
      });

      setGeneratedResult({
        url: `${window.location.origin}${url}`,
        token,
        expiresAt,
      });
      toast.success("Acesso de cuidador gerado com sucesso!");
    } catch (err) {
      console.error("PetSitterConfigModal error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar acesso");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Modo Cuidador / Pet Sitter"
      description={`Visão simplificada e segura para hotelzinhos, creches e passeadores cuidando de ${pet.name}.`}
    >
      {generatedResult ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success-ink">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>

          <div>
            <h3 className="text-lg font-bold text-ink">
              Link do Cuidador Criado!
            </h3>
            <p className="text-sm text-muted">
              Mostre este QR Code ou envie o link por WhatsApp para quem for
              cuidar de {pet.name}.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
            <QrCode value={generatedResult.url} className="size-48" />
          </div>

          {pin ? (
            <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 font-mono text-sm text-ink">
              <Lock aria-hidden="true" className="size-4 text-teal-ink" />
              PIN de Desbloqueio: <strong>{pin}</strong>
            </div>
          ) : (
            <span className="text-xs text-muted">
              Link sem PIN (acesso direto).
            </span>
          )}

          <div className="flex w-full flex-col gap-2 pt-2">
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(generatedResult.url);
                toast.success("Link copiado para a área de transferência!");
              }}
              className="w-full"
            >
              <Copy aria-hidden="true" className="size-4" />
              Copiar Link do Cuidador
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                const message = encodeURIComponent(
                  `Olá! Aqui está o acesso aos cuidados e remédios de ${pet.name}: ${generatedResult.url}${
                    pin ? ` (PIN de acesso: ${pin})` : ""
                  }`,
                );
                window.open(`https://wa.me/?text=${message}`, "_blank");
              }}
              className="w-full"
            >
              Compartilhar no WhatsApp
            </Button>

            <Link
              href={generatedResult.url}
              target="_blank"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control text-sm font-semibold text-teal-ink hover:underline"
            >
              Visualizar como o cuidador verá
              <ExternalLink aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="mt-2 rounded-xl bg-surface p-3 text-left text-xs leading-relaxed text-muted">
            <strong>Garantia de Privacidade Zelupi:</strong> O cuidador verá
            apenas a rotina de alimentação, horários dos remédios, alergias e
            botões de emergência. Seu histórico completo, diários e documentos
            particulares NÃO são compartilhados.
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGeneratedResult(null)}
            className="mt-1"
          >
            Voltar e configurar outro acesso
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleGenerate(e)}
          className="flex flex-col gap-4"
        >
          <div className="rounded-xl border border-teal-ink/20 bg-teal-ink/5 p-3 text-xs leading-relaxed text-teal-ink">
            <strong>Modo Seguro para Hotelzinho e Passeador:</strong> Cria um
            link temporário que mostra somente o essencial para quem for cuidar
            do seu pet, sem expor dados particulares.
          </div>

          {/* Sitter name & PIN */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              htmlFor="sitter-name"
              label="Nome do Cuidador / Hotel"
              hint="Opcional"
            >
              <Input
                id="sitter-name"
                placeholder="Ex: Hotel Cão Feliz"
                value={sitterName}
                onChange={(e) => setSitterName(e.target.value)}
              />
            </Field>

            <Field
              htmlFor="sitter-pin"
              label="PIN de Proteção"
              hint="4 a 6 dígitos (opcional)"
            >
              <Input
                id="sitter-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Ex: 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </Field>
          </div>

          <Field htmlFor="sitter-expires" label="Tempo de Validade do Link">
            <Select
              id="sitter-expires"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
            >
              <option value={1}>24 horas (passeio ou diária rápida)</option>
              <option value={3}>3 dias (fim de semana)</option>
              <option value={7}>7 dias (uma semana)</option>
              <option value={15}>15 dias (férias)</option>
              <option value={30}>30 dias</option>
            </Select>
          </Field>

          {/* Alergias & Cuidados Especiais */}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <ShieldAlert
                aria-hidden="true"
                className="size-4 text-danger-ink"
              />
              Alergias e Restrições Críticas
            </div>
            <p className="text-xs text-muted">
              Destaque o que o cuidador NUNCA pode dar ou fazer.
            </p>
            <Field
              htmlFor="sitter-allergies"
              label="Alergias alimentares ou medicamentosas"
            >
              <Input
                id="sitter-allergies"
                placeholder="Ex: Alergia a frango, Não dar corante, Picada de abelha"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
              />
            </Field>

            <Field
              htmlFor="sitter-special"
              label="Recomendações e comportamento"
            >
              <Textarea
                id="sitter-special"
                rows={2}
                placeholder="Ex: Tem medo de trovão. Passear sempre de peitoral, nunca na coleira comum."
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
              />
            </Field>
          </div>

          {/* Rotina Alimentar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <Utensils aria-hidden="true" className="size-4 text-teal-ink" />
                Rotina Alimentar
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addFeedingRow}
                className="text-xs"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Adicionar Horário
              </Button>
            </div>

            {feedingItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl bg-surface p-2"
              >
                <Input
                  type="time"
                  className="w-24 shrink-0 text-sm"
                  value={item.time}
                  onChange={(e) => {
                    const time = e.target.value;
                    setFeedingItems((prev) =>
                      prev.map((f, i) => (i === idx ? { ...f, time } : f)),
                    );
                  }}
                />
                <Input
                  placeholder="Descrição (Ex: Ração Seca)"
                  className="flex-1 text-sm"
                  value={item.description}
                  onChange={(e) => {
                    const desc = e.target.value;
                    setFeedingItems((prev) =>
                      prev.map((f, i) =>
                        i === idx ? { ...f, description: desc } : f,
                      ),
                    );
                  }}
                />
                <Input
                  placeholder="Qtd (150g)"
                  className="w-20 shrink-0 text-sm"
                  value={item.amount}
                  onChange={(e) => {
                    const amount = e.target.value;
                    setFeedingItems((prev) =>
                      prev.map((f, i) => (i === idx ? { ...f, amount } : f)),
                    );
                  }}
                />
                {feedingItems.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeFeedingRow(item.id)}
                    className="p-1 text-muted hover:text-danger-ink"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Contatos de Emergência */}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Phone aria-hidden="true" className="size-4 text-teal-ink" />
              Contatos de Emergência 1-Toque
            </div>

            <Field
              htmlFor="sitter-tutor-phone"
              label="Telefone do Tutor (WhatsApp)"
            >
              <Input
                id="sitter-tutor-phone"
                required
                placeholder="(11) 98765-4321"
                value={tutorPhone}
                onChange={(e) => setTutorPhone(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                htmlFor="sitter-vet-name"
                label="Veterinário / Clínica 24h"
              >
                <Input
                  id="sitter-vet-name"
                  required
                  placeholder="Nome do Vet ou Clínica"
                  value={emergencyVetName}
                  onChange={(e) => setEmergencyVetName(e.target.value)}
                />
              </Field>

              <Field
                htmlFor="sitter-vet-phone"
                label="Telefone de Emergência Vet"
              >
                <Input
                  id="sitter-vet-phone"
                  required
                  placeholder="(11) 3333-4444"
                  value={emergencyVetPhone}
                  onChange={(e) => setEmergencyVetPhone(e.target.value)}
                />
              </Field>
            </div>

            <Field
              htmlFor="sitter-vet-address"
              label="Endereço da Clínica de Emergência"
              hint="Opcional (para abrir no mapa do cuidador)"
            >
              <Input
                id="sitter-vet-address"
                placeholder="Rua, número, bairro..."
                value={emergencyAddress}
                onChange={(e) => setEmergencyAddress(e.target.value)}
              />
            </Field>
          </div>

          {!user?.id && (
            <p className="text-sm text-muted">
              Para compartilhar os cuidados em outro aparelho,{" "}
              <Link
                href="/account"
                className="font-semibold text-teal-ink underline"
              >
                entre na sua conta
              </Link>
              .
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !user?.id}
              className="flex-1"
            >
              {submitting ? "Gerando..." : "Gerar Acesso Seguro"}
            </Button>
          </div>
        </form>
      )}
    </BottomSheet>
  );
}
