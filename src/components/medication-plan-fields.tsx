"use client";

import { z } from "zod";
import { Field, Input, Textarea } from "@/components/ui/field";
import { todayKey } from "@/lib/domain/dates";
import {
  medicationPlanInputSchema,
  type MedicationPlanInput,
} from "@/lib/domain/schema";

// Drafts accept incomplete values; the prescribed plan is validated on save.
export const medicationPlanDraftSchema = z.object({
  amount: z.string().max(30),
  unit: z.string().max(30),
  times: z.string().max(100),
  everyDays: z.string().max(3),
  startsOn: z.string().max(10),
  endsOn: z.string().max(10),
  timeZone: z.string().max(80),
  instructions: z.string().max(600),
  source: z.string().max(160),
});
export type MedicationPlanDraft = z.infer<typeof medicationPlanDraftSchema>;

export function medicationPlanDraft(
  plan?: MedicationPlanInput,
): MedicationPlanDraft {
  return {
    amount: plan?.amount ?? "",
    unit: plan?.unit ?? "",
    times: plan?.times.join(", ") ?? "",
    everyDays: String(plan?.everyDays ?? 1),
    startsOn: plan?.startsOn ?? todayKey(),
    endsOn: plan?.endsOn ?? "",
    timeZone:
      plan?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    instructions: plan?.instructions ?? "",
    source: plan?.source ?? "",
  };
}

export function parseMedicationPlanDraft(
  value: MedicationPlanDraft,
): MedicationPlanInput {
  const result = medicationPlanInputSchema.safeParse({
    ...value,
    times: value.times.split(/[,;\s]+/).filter(Boolean),
    everyDays: Number(value.everyDays),
    endsOn: value.endsOn || null,
  });
  if (!result.success)
    throw new Error(
      "Confira quantidade, unidade, horários, intervalo, datas, fuso e origem da prescrição. Use horários únicos no formato 08:00, 20:00.",
    );
  return result.data;
}

export function MedicationPlanFields({
  value,
  onChange,
  prefix = "medication",
}: {
  value: MedicationPlanDraft;
  onChange: (value: MedicationPlanDraft) => void;
  prefix?: string;
}) {
  const field = (key: keyof MedicationPlanDraft, next: string) =>
    onChange({ ...value, [key]: next });
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-[18px] border border-line bg-surface/50 p-4">
      <legend className="px-1 text-sm font-bold text-ink">
        Plano informado na prescrição
      </legend>
      <p className="text-meta text-muted">
        Copie a quantidade, os horários e a duração que você recebeu. A Zelupi
        apenas organiza esse plano; nenhuma dose é calculada pelo app.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Quantidade por dose"
          htmlFor={`${prefix}-amount`}
          hint="Ex.: 1, 0,5 ou 1/2"
        >
          <Input
            id={`${prefix}-amount`}
            value={value.amount}
            maxLength={30}
            onChange={(e) => field("amount", e.target.value)}
          />
        </Field>
        <Field
          label="Unidade da dose"
          htmlFor={`${prefix}-unit`}
          hint="Conforme a receita: comprimido, mL, gota…"
        >
          <Input
            id={`${prefix}-unit`}
            value={value.unit}
            maxLength={30}
            onChange={(e) => field("unit", e.target.value)}
          />
        </Field>
      </div>
      <Field
        label="Horários planejados"
        htmlFor={`${prefix}-times`}
        hint="Separe por vírgulas. Ex.: 08:00, 20:00 (até 12 horários)"
      >
        <Input
          id={`${prefix}-times`}
          value={value.times}
          maxLength={100}
          placeholder="08:00, 20:00"
          onChange={(e) => field("times", e.target.value)}
        />
      </Field>
      <Field
        label="Repetir a cada quantos dias?"
        htmlFor={`${prefix}-interval`}
        hint="1 = todos os dias. Dias de calendário a partir da data de início, nos horários acima."
      >
        <Input
          id={`${prefix}-interval`}
          type="number"
          min={1}
          max={365}
          value={value.everyDays}
          onChange={(e) => field("everyDays", e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Início do plano" htmlFor={`${prefix}-start`}>
          <Input
            id={`${prefix}-start`}
            type="date"
            value={value.startsOn}
            onChange={(e) => field("startsOn", e.target.value)}
          />
        </Field>
        <Field
          label="Último dia previsto"
          htmlFor={`${prefix}-end`}
          hint="Deixe vazio se não foi definido"
        >
          <Input
            id={`${prefix}-end`}
            type="date"
            min={value.startsOn}
            value={value.endsOn}
            onChange={(e) => field("endsOn", e.target.value)}
          />
        </Field>
      </div>
      <Field
        label="Fuso dos horários"
        htmlFor={`${prefix}-zone`}
        hint="Mantido durante viagens. Ex.: America/Sao_Paulo"
      >
        <Input
          id={`${prefix}-zone`}
          value={value.timeZone}
          maxLength={80}
          onChange={(e) => field("timeZone", e.target.value)}
        />
      </Field>
      <Field
        label="Origem da prescrição"
        htmlFor={`${prefix}-source`}
        hint="Profissional, clínica ou identificação da receita"
      >
        <Input
          id={`${prefix}-source`}
          value={value.source}
          maxLength={160}
          onChange={(e) => field("source", e.target.value)}
        />
      </Field>
      <Field
        label="Instruções recebidas"
        htmlFor={`${prefix}-instructions`}
        hint="Opcional; transcreva a orientação recebida"
      >
        <Textarea
          id={`${prefix}-instructions`}
          value={value.instructions}
          maxLength={600}
          onChange={(e) => field("instructions", e.target.value)}
        />
      </Field>
    </fieldset>
  );
}
