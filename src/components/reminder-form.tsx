"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { isValidDateKey, todayKey } from "@/lib/domain/dates";
import type { Pet, Reminder } from "@/lib/domain/schema";
import type { NewReminderInput } from "@/lib/store/app-store";

export function ReminderForm({
  pets,
  petId,
  initial,
  onSubmit,
  onDelete,
  onCancel,
}: {
  pets: Pet[];
  petId?: string;
  initial?: Reminder;
  onSubmit: (values: NewReminderInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [selectedPet, setSelectedPet] = useState(
    initial?.petId ?? petId ?? pets[0]?.id ?? "",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState<Reminder["kind"]>(initial?.kind ?? "rotina");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? todayKey());
  const [leadDays, setLeadDays] = useState(initial?.leadDays ?? 1);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!pets.some((pet) => pet.id === selectedPet)) {
      setError("Escolha o pet deste lembrete.");
      return;
    }
    if (!title.trim()) {
      setError("Dê um nome ao lembrete.");
      return;
    }
    if (!isValidDateKey(dueDate)) {
      setError("Informe uma data válida.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        petId: selectedPet,
        title: title.trim(),
        kind,
        dueDate,
        leadDays,
        notes: notes.trim() || null,
        done: initial?.done ?? false,
        completedAt: initial?.completedAt ?? null,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-danger/10 p-3 text-sm text-danger-ink"
        >
          {error}
        </p>
      ) : null}
      <Field label="Pet" htmlFor="reminder-pet">
        <Select
          id="reminder-pet"
          value={selectedPet}
          onChange={(event) => setSelectedPet(event.target.value)}
          disabled={Boolean(initial)}
        >
          {pets.map((pet) => (
            <option key={pet.id} value={pet.id}>
              {pet.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Nome do lembrete"
        htmlFor="reminder-title"
        hint="Ex.: Comprar ração, banho ou passeio"
      >
        <Input
          id="reminder-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data" htmlFor="reminder-date">
          <Input
            id="reminder-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Categoria" htmlFor="reminder-kind">
          <Select
            id="reminder-kind"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as Reminder["kind"])
            }
          >
            <option value="rotina">Rotina</option>
            <option value="saude">Saúde</option>
            <option value="outro">Outro</option>
          </Select>
        </Field>
      </div>
      <Field label="Quando avisar na agenda" htmlFor="reminder-lead">
        <Select
          id="reminder-lead"
          value={leadDays}
          onChange={(event) => setLeadDays(Number(event.target.value))}
        >
          {[
            0,
            1,
            3,
            7,
            15,
            30,
            ...(![0, 1, 3, 7, 15, 30].includes(leadDays) ? [leadDays] : []),
          ].map((days) => (
            <option key={days} value={days}>
              {days === 0
                ? "No dia"
                : `${days} ${days === 1 ? "dia" : "dias"} antes`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Observações" htmlFor="reminder-notes" hint="Opcional">
        <Textarea
          id="reminder-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={400}
        />
      </Field>
      <p className="text-meta text-muted">
        O aviso aparece dentro da Zelupi. Este lembrete não cria um registro de
        saúde.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : initial ? "Salvar lembrete" : "Criar lembrete"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={pending}
      >
        Cancelar
      </Button>
      {onDelete ? (
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={async () => {
            try {
              setPending(true);
              await onDelete();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Não foi possível excluir.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          Excluir lembrete
        </Button>
      ) : null}
    </form>
  );
}
