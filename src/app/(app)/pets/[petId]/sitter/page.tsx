"use client";

import {
  Check,
  CheckCircle2,
  HeartPulse,
  LogOut,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
  Pill,
  ShieldAlert,
  Utensils,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { BottomSheet } from "@/components/ui/sheet";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { todayKey } from "@/lib/domain/dates";
import { speciesLabels } from "@/lib/domain/labels";
import { petAge } from "@/lib/domain/pet";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

export default function LocalPetSitterPage() {
  const params = useParams<{ petId: string }>();
  const router = useRouter();
  const ready = useHydrated();

  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const records = useAppStore((state) =>
    state.records.filter((r) => r.petId === params.petId),
  );
  const tutor = useAppStore((state) => state.tutor);
  const recordMedicationDose = useAppStore(
    (state) => state.recordMedicationDose,
  );

  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [servedMeals, setServedMeals] = useState<Record<string, string>>({});
  const [givenDoses, setGivenDoses] = useState<Record<string, string>>({});

  const activeMedications = useMemo(() => {
    const list: Array<{
      recordId: string;
      scheduleId: string;
      name: string;
      amount: string;
      unit: string;
      times: string[];
      instructions: string;
    }> = [];

    for (const record of records) {
      if (record.type === "medicamento" && record.medication?.schedules) {
        for (const schedule of record.medication.schedules) {
          if (!schedule.closedAt || new Date(schedule.closedAt) > new Date()) {
            list.push({
              recordId: record.id,
              scheduleId: schedule.id,
              name: record.title,
              amount: schedule.amount,
              unit: schedule.unit,
              times: schedule.times,
              instructions: schedule.instructions,
            });
          }
        }
      }
    }
    return list;
  }, [records]);

  if (!ready) return <SkeletonScreen label="Abrindo Modo Cuidador" />;

  if (!pet) {
    return (
      <main className="p-6 text-center">
        <p className="text-muted">Pet não encontrado.</p>
        <Link
          href="/pets"
          className="mt-4 inline-block font-semibold text-teal-ink"
        >
          Voltar
        </Link>
      </main>
    );
  }

  const age = petAge(pet.birthDate);
  const emergencyVet = pet.emergencyVet;
  const tutorPhone = pet.card?.contact?.replace(/[^\d+]/g, "") || "";
  const vetPhone = emergencyVet?.phone?.replace(/[^\d+]/g, "") || "";

  function handleExit() {
    setExitModalOpen(false);
    toast.success("Modo Cuidador encerrado");
    router.push(`/pets`);
  }

  function handleMarkMeal(id: string, time: string) {
    const nowTime = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setServedMeals((prev) => ({ ...prev, [id]: nowTime }));
    toast.success(`Refeição das ${time} marcada como servida!`);
  }

  async function handleMarkDose(
    recordId: string,
    scheduleId: string,
    name: string,
    time: string,
  ) {
    try {
      const now = new Date();
      const nowTime = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      await recordMedicationDose(recordId, {
        scheduleId,
        date: todayKey(),
        time,
        status: "given",
        expectedEventId: null,
        recordedBy: "Cuidador",
        actorRole: "cuidador",
      });
      setGivenDoses((prev) => ({
        ...prev,
        [`${scheduleId}:${time}`]: nowTime,
      }));
      toast.success(`Dose de ${name} das ${time} registrada!`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Erro ao registrar dose",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      {/* Visão simplificada de cuidados no aparelho */}
      <div className="flex items-center justify-between rounded-2xl bg-teal-ink px-4 py-3 text-white shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <HeartPulse aria-hidden="true" className="size-4" />
          <span>Visão de cuidados no aparelho</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExitModalOpen(true)}
          className="text-xs font-bold"
        >
          <LogOut aria-hidden="true" className="size-3.5" />
          Sair do Modo Cuidador
        </Button>
      </div>

      {/* Header do Pet */}
      <section className="flex flex-col items-center gap-2 text-center">
        {pet.photo ? (
          <div className="relative size-24 overflow-hidden rounded-full border-4 border-paper shadow-md">
            <Image
              src={pet.photo}
              alt={pet.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex size-24 items-center justify-center rounded-full bg-teal-ink/10 text-teal-ink border-4 border-paper shadow-md">
            <PawPrint aria-hidden="true" className="size-10" />
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {pet.name}
          </h1>
          <p className="text-sm text-muted">
            {speciesLabels[pet.species]}
            {pet.breed ? ` · ${pet.breed}` : ""}
            {age ? ` · ${age}` : ""}
          </p>
        </div>
      </section>

      {/* Alergias e Restrições Críticas */}
      {pet.allergies && pet.allergies.length > 0 ? (
        <section
          aria-label="Alergias críticas"
          className="flex flex-col gap-2 rounded-2xl border-2 border-danger-ink/40 bg-danger-soft/60 p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 font-bold text-danger-ink">
            <ShieldAlert aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-base">ATENÇÃO: Alergias e Restrições</h2>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {pet.allergies.map((allergy) => (
              <span
                key={allergy}
                className="inline-flex items-center rounded-lg bg-danger-ink px-2.5 py-1 text-xs font-bold text-white shadow-sm"
              >
                ⚠️ {allergy}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Contatos de Emergência */}
      <section aria-label="Contatos de emergência">
        <h2 className="mb-2 text-meta font-bold uppercase tracking-wider text-muted">
          Emergência 1-Toque
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Tutor */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-sm">
            <div>
              <span className="text-xs font-semibold text-muted">Tutor(a)</span>
              <p className="text-sm font-bold text-ink">
                {tutor?.name || "Tutor do Pet"}
              </p>
            </div>
            {tutorPhone ? (
              <div className="mt-3 flex gap-2">
                <a
                  href={`tel:${tutorPhone}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-ink px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-deep"
                >
                  <Phone aria-hidden="true" className="size-3.5" />
                  Ligar Tutor
                </a>
                <a
                  href={`https://wa.me/${tutorPhone}?text=Ol%C3%A1%2C%20estou%20cuidando%20de%20${encodeURIComponent(
                    pet.name,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                </a>
              </div>
            ) : null}
          </div>

          {/* Veterinário */}
          {emergencyVet ? (
            <div className="flex flex-col justify-between rounded-2xl border-2 border-danger-ink/20 bg-paper p-3.5 shadow-sm">
              <div>
                <span className="text-xs font-semibold text-danger-ink">
                  Veterinário 24h
                </span>
                <p className="text-sm font-bold text-ink">
                  {emergencyVet.name}
                </p>
                {emergencyVet.clinicName ? (
                  <p className="text-xs text-muted">
                    {emergencyVet.clinicName}
                  </p>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  href={`tel:${vetPhone}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-danger-ink px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-danger"
                >
                  <Phone aria-hidden="true" className="size-3.5" />
                  Ligar Vet
                </a>
                {emergencyVet.address ? (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      emergencyVet.address,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink"
                  >
                    <MapPin aria-hidden="true" className="size-4" />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Rotina Alimentar */}
      {pet.feedingRoutine && pet.feedingRoutine.length > 0 ? (
        <section aria-label="Rotina alimentar">
          <h2 className="mb-2 flex items-center gap-1.5 text-meta font-bold uppercase tracking-wider text-muted">
            <Utensils aria-hidden="true" className="size-4 text-teal-ink" />
            Rotina Alimentar
          </h2>
          <div className="flex flex-col gap-2">
            {pet.feedingRoutine.map((feed) => {
              const servedAt = servedMeals[feed.id];
              return (
                <div
                  key={feed.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-surface px-2.5 py-1.5 font-mono text-sm font-bold text-teal-ink">
                      {feed.time}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {feed.description}
                      </p>
                      <p className="text-xs text-muted">
                        Porção: {feed.amount}
                      </p>
                    </div>
                  </div>

                  <div>
                    {servedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-success-ink">
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                        Servida ({servedAt})
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkMeal(feed.id, feed.time)}
                        className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-teal-ink hover:text-white"
                      >
                        Servir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Medicamentos Ativos */}
      {activeMedications.length > 0 ? (
        <section aria-label="Remédios ativos">
          <h2 className="mb-2 flex items-center gap-1.5 text-meta font-bold uppercase tracking-wider text-muted">
            <Pill aria-hidden="true" className="size-4 text-teal-ink" />
            Horários de Remédios
          </h2>
          <div className="flex flex-col gap-2.5">
            {activeMedications.map((med) => (
              <div
                key={`${med.recordId}-${med.scheduleId}`}
                className="flex flex-col gap-2.5 rounded-2xl border border-line bg-paper p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-ink">{med.name}</h3>
                    <p className="text-xs text-muted">
                      {med.amount} {med.unit}
                    </p>
                  </div>
                  <Chip tone="teal">Em curso</Chip>
                </div>

                {med.instructions ? (
                  <p className="rounded-xl bg-surface/60 p-2.5 text-xs leading-relaxed text-ink-soft">
                    <strong>Como dar:</strong> {med.instructions}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  {med.times.map((t) => {
                    const key = `${med.scheduleId}:${t}`;
                    const isGiven = Boolean(givenDoses[key]);

                    return (
                      <div
                        key={t}
                        className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 text-xs"
                      >
                        <span className="font-mono font-bold text-ink">
                          {t}
                        </span>
                        {isGiven ? (
                          <span className="inline-flex items-center gap-1 font-bold text-success-ink">
                            <Check aria-hidden="true" className="size-3.5" />
                            Dada ({givenDoses[key]})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void handleMarkDose(
                                med.recordId,
                                med.scheduleId,
                                med.name,
                                t,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-teal-ink px-2.5 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-deep"
                          >
                            <Check aria-hidden="true" className="size-3" />
                            Dar remédio
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Modal para sair do modo cuidador */}
      <BottomSheet
        open={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        title="Sair do Modo Cuidador"
        description="Confirme para retornar à visão completa do app."
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Esta visão organiza os cuidados e permite voltar aos demais dados do
            pet.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setExitModalOpen(false)}
              className="flex-1"
            >
              Continuar no Cuidador
            </Button>
            <Button onClick={handleExit} className="flex-1">
              Voltar ao app
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
