"use client";

import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartPulse,
  Lock,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/field";
import {
  fetchSitterPass,
  recordSitterCareAction,
  verifySitterPassPin,
} from "@/lib/cloud/sitter-client";
import type { SitterViewData } from "@/lib/domain/collaboration";
import { formatShortDate, todayKey } from "@/lib/domain/dates";
import { speciesLabels } from "@/lib/domain/labels";
import { petAge } from "@/lib/domain/pet";

export default function SitterAccessPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [sitterName, setSitterName] = useState<string | null>(null);
  const [data, setData] = useState<SitterViewData | null>(null);

  // Caregiver interaction tracking
  const [servedMeals, setServedMeals] = useState<Record<string, string>>({});
  const [givenDoses, setGivenDoses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchSitterPass(token)
      .then((res) => {
        if (cancelled) return;
        setHasPin(res.hasPin);
        setSitterName(res.sitterName);
        if (res.data) {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o acesso de cuidador.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleUnlockPin(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPinVerifying(true);
    setPinError(null);
    try {
      const unlocked = await verifySitterPassPin(token, pinInput.trim());
      setData(unlocked);
      toast.success("Cuidados desbloqueados!");
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "PIN incorreto");
    } finally {
      setPinVerifying(false);
    }
  }

  async function markMealServed(feedId: string, time: string, desc: string) {
    const nowTime = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setServedMeals((prev) => ({ ...prev, [feedId]: nowTime }));
    toast.success(`Refeição das ${time} marcada como servida!`);

    if (token) {
      void recordSitterCareAction(token, {
        eventType: "meal",
        eventKey: `meal:${feedId}:${todayKey()}`,
        status: "served",
        actorName: sitterName || "Cuidador",
        payload: { description: desc, time },
      }).catch(() => {});
    }
  }

  async function markDoseGiven(
    recordId: string,
    scheduleId: string,
    name: string,
    time: string,
    amount: string,
    unit: string,
  ) {
    const key = `${scheduleId}:${todayKey()}:${time}`;
    const nowTime = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setGivenDoses((prev) => ({ ...prev, [key]: nowTime }));
    toast.success(`Dose de ${name} (${amount} ${unit}) registrada!`, {
      description: "O tutor foi notificado e pode ver que a dose foi dada.",
    });

    if (token) {
      void recordSitterCareAction(token, {
        eventType: "medication_dose",
        eventKey: key,
        status: "given",
        actorName: sitterName || "Cuidador",
        payload: { recordId, scheduleId, name, amount, unit, time },
      }).catch(() => {});
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center p-6 text-center">
        <Brand className="mb-4" />
        <div className="flex size-12 animate-pulse items-center justify-center rounded-full bg-surface text-muted">
          <PawPrint aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-muted">
          Carregando informações de cuidados…
        </p>
      </main>
    );
  }

  if (error || (!data && !hasPin)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center p-6 text-center">
        <Brand className="mb-4" />
        <span className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger-ink">
          <ShieldAlert aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">Acesso Indisponível</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {error ||
            "Este link de cuidador pode ter expirado ou sido encerrado pelo tutor."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-teal-ink px-5 text-sm font-semibold text-white"
        >
          Conhecer a Zelupi
        </Link>
      </main>
    );
  }

  // PIN Unlock Screen
  if (hasPin && !data) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-8 text-center">
        <Brand className="mb-4" />

        <div className="w-full rounded-[24px] border border-line bg-paper p-6 shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-ink/10 text-teal-ink">
            <Lock aria-hidden="true" className="size-7" />
          </span>

          <h1 className="mt-4 text-xl font-bold text-ink">Modo Cuidador Protegido</h1>
          <p className="mt-1 text-sm text-muted">
            Este acesso requer o PIN numérico configurado pelo tutor.
          </p>

          <form onSubmit={(e) => void handleUnlockPin(e)} className="mt-6 flex flex-col gap-4">
            <Field htmlFor="pin" label="Digite o PIN (4 a 6 dígitos)">
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                placeholder="• • • •"
                className="text-center font-mono text-xl tracking-[0.3em]"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                disabled={pinVerifying}
              />
            </Field>

            {pinError ? (
              <p role="alert" className="text-sm font-medium text-danger-ink">
                {pinError}
              </p>
            ) : null}

            <Button type="submit" disabled={pinVerifying} className="w-full">
              {pinVerifying ? "Verificando…" : "Desbloquear Cuidados"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-xs text-muted">
          Zelupi · Cuidado seguro com privacidade estrita.
        </p>
      </main>
    );
  }

  // Unlocked Caregiver Dashboard
  const pet = data!.pet;
  const allergies = data!.allergies;
  const emergency = data!.emergencyContact;
  const feeding = data!.feedingSchedule;
  const meds = data!.medicationSchedule;
  const age = petAge(pet.birthDate);

  const tutorCleanPhone = emergency.tutorPhone.replace(/[^\d+]/g, "");
  const vetCleanPhone = emergency.emergencyVetPhone.replace(/[^\d+]/g, "");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-8 pb-16">
      {/* Header */}
      <header className="flex flex-col items-center gap-3 text-center">
        <Brand className="mb-1" />

        <div className="relative">
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
          <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-teal-ink text-white shadow-sm">
            <HeartPulse aria-hidden="true" className="size-4" />
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{pet.name}</h1>
          <p className="text-sm text-muted">
            {speciesLabels[pet.species]}
            {pet.breed ? ` · ${pet.breed}` : ""}
            {age ? ` · ${age}` : ""}
          </p>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <Chip tone="teal">Modo Cuidador Ativo</Chip>
            {sitterName ? <Chip tone="muted">{sitterName}</Chip> : null}
          </div>
        </div>
      </header>

      {/* ALERTA CRÍTICO DE ALERGIAS */}
      {allergies && allergies.length > 0 ? (
        <section
          aria-label="Alergias e restrições críticas"
          className="flex flex-col gap-2 rounded-2xl border-2 border-danger-ink/40 bg-danger-soft/60 p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 font-bold text-danger-ink">
            <ShieldAlert aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-base">ATENÇÃO: Alergias e Restrições</h2>
          </div>
          <p className="text-xs text-ink-soft">
            Nunca ofereça os itens abaixo sob nenhuma circunstância:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {allergies.map((allergy) => (
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

      {/* RECOMENDAÇÕES / COMPORTAMENTO */}
      {data?.specialCareNotes ? (
        <Card className="flex flex-col gap-1.5 border-line/70 bg-amber-50/50 dark:bg-amber-950/20">
          <span className="text-meta font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
            Cuidados de Comportamento
          </span>
          <p className="text-sm leading-relaxed text-ink">
            {data.specialCareNotes}
          </p>
        </Card>
      ) : null}

      {/* BOTÕES DE EMERGÊNCIA 1-TOQUE */}
      <section aria-label="Contatos de emergência">
        <h2 className="mb-2 text-meta font-bold uppercase tracking-wider text-muted">
          Emergência 1-Toque
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Contato Tutor */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-sm">
            <div>
              <span className="text-xs font-semibold text-muted">Tutor(a)</span>
              <p className="text-sm font-bold text-ink">{emergency.tutorName}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={`tel:${tutorCleanPhone}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-ink px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-deep"
              >
                <Phone aria-hidden="true" className="size-3.5" />
                Ligar
              </a>
              <a
                href={`https://wa.me/${tutorCleanPhone}?text=Ol%C3%A1%2C%20estou%20cuidando%20de%20${encodeURIComponent(
                  pet.name,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                title="Conversar no WhatsApp"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
              </a>
            </div>
          </div>

          {/* Veterinário de Emergência 24h */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-danger-ink/20 bg-paper p-3.5 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-danger-ink">
                  Veterinário 24h
                </span>
                <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger-ink">
                  EMERGÊNCIA
                </span>
              </div>
              <p className="text-sm font-bold text-ink">{emergency.emergencyVetName}</p>
              {emergency.emergencyClinicName ? (
                <p className="text-xs text-muted">{emergency.emergencyClinicName}</p>
              ) : null}
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={`tel:${vetCleanPhone}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-danger-ink px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-danger"
              >
                <Phone aria-hidden="true" className="size-3.5" />
                Ligar Vet
              </a>
              {emergency.emergencyAddress ? (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    emergency.emergencyAddress,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-surface/80"
                  title="Ver endereço no mapa"
                >
                  <MapPin aria-hidden="true" className="size-4" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ROTINA ALIMENTAR */}
      {feeding && feeding.length > 0 ? (
        <section aria-label="Rotina alimentar">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-meta font-bold uppercase tracking-wider text-muted">
              <Utensils aria-hidden="true" className="size-4 text-teal-ink" />
              Rotina Alimentar
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {feeding.map((feed) => {
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
                      <p className="text-xs text-muted">Porção: {feed.amount}</p>
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
                        onClick={() =>
                          void markMealServed(feed.id, feed.time, feed.description)
                        }
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

      {/* REMÉDIOS DO DIA */}
      {meds && meds.length > 0 ? (
        <section aria-label="Medicamentos do dia">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-meta font-bold uppercase tracking-wider text-muted">
              <Pill aria-hidden="true" className="size-4 text-teal-ink" />
              Horários de Remédios
            </h2>
            <span className="text-xs text-muted">{meds.length} ativos</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {meds.map((med) => (
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

                {/* Horários e status */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {med.times.map((t) => {
                    const doseKey = `${med.scheduleId}:${todayKey()}:${t}`;
                    const isGiven = Boolean(givenDoses[doseKey]);

                    return (
                      <div
                        key={t}
                        className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 text-xs"
                      >
                        <span className="font-mono font-bold text-ink">{t}</span>
                        {isGiven ? (
                          <span className="inline-flex items-center gap-1 font-bold text-success-ink">
                            <Check aria-hidden="true" className="size-3.5" />
                            Dada ({givenDoses[doseKey]})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void markDoseGiven(
                                med.recordId,
                                med.scheduleId,
                                med.name,
                                t,
                                med.amount,
                                med.unit,
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

      {/* Rodapé de Privacidade */}
      <footer className="mt-4 flex flex-col items-center gap-2 text-center text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <ShieldCheck aria-hidden="true" className="size-4 text-teal-ink" />
          <span>Modo Cuidador Seguro · Zelupi</span>
        </div>
        <p className="max-w-xs leading-relaxed">
          Histórico clínico confidencial, anexos e diários particulares são
          preservados com segurança.
        </p>
      </footer>
    </main>
  );
}
