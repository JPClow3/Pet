"use client";

import { Eye, EyeOff, Lock, NotebookPen, Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { CareHeader } from "@/components/care-tabs";
import { PetContextSwitcher } from "@/components/pet-header";
import { PhotoPicker } from "@/components/photo-picker";
import { Photo } from "@/components/ui/photo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { formatFullDate, isValidDateKey, todayKey } from "@/lib/domain/dates";
import type { DiaryEntry } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";
import { useFormDraft } from "@/lib/use-form-draft";
import { useAsyncAction } from "@/lib/use-async-action";

const diaryDraftSchema = z.object({
  text: z.string().max(800),
  date: z.string().max(10),
  place: z.string().max(80),
  weight: z.string().max(40),
  tags: z.array(z.string().max(40)).max(8),
  visibility: z.enum(["privado", "publico"]),
});

const tagSuggestions = [
  "passeio",
  "banho",
  "peso",
  "treino",
  "viagem",
  "saúde",
  "primeira vez",
];

export default function DiaryPage() {
  const params = useParams<{ petId: string }>();
  return <PetDiaryPage key={params.petId} />;
}

function PetDiaryPage() {
  const params = useParams<{ petId: string }>();
  const router = useRouter();
  const ready = useHydrated();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const diary = useAppStore((state) => state.diary);
  const addDiaryEntry = useAppStore((state) => state.addDiaryEntry);
  const updateDiaryEntry = useAppStore((state) => state.updateDiaryEntry);
  const removeDiaryEntry = useAppStore((state) => state.removeDiaryEntry);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const initialDraft = useMemo<z.infer<typeof diaryDraftSchema>>(
    () => ({
      text: editing?.text ?? "",
      date: editing?.date ?? todayKey(),
      place: editing?.place ?? "",
      weight: editing?.weightKg ? String(editing.weightKg) : "",
      tags: editing?.tags ?? [],
      visibility: editing?.visibility ?? "privado",
    }),
    [editing],
  );
  const draft = useFormDraft({
    key: `diary:${params.petId}:${editing?.id ?? "new"}`,
    schema: diaryDraftSchema,
    initialValue: initialDraft,
    enabled: ready,
  });
  const { text, date, place, weight, tags, visibility } = draft.value;
  function setField<K extends keyof typeof initialDraft>(
    key: K,
    value: (typeof initialDraft)[K],
  ) {
    draft.setValue((current) => ({ ...current, [key]: value }));
  }
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const removal = useAsyncAction();

  const entries = useMemo(
    () =>
      diary
        .filter((entry) => entry.petId === params.petId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [diary, params.petId],
  );

  function resetForm() {
    setEditing(null);
    setPhoto(null);
    setError(null);
  }

  function openNew() {
    resetForm();
    setOpen(true);
  }

  function openEdit(entry: DiaryEntry) {
    setEditing(entry);
    setPhoto(entry.photo);
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!pet || submitting.current) return;
    if (text.trim().length === 0) {
      setError("Escreva pelo menos uma linha sobre esse momento.");
      return;
    }
    const parsedWeight =
      weight.trim() === "" ? null : Number(weight.replace(",", "."));
    if (
      parsedWeight !== null &&
      (!Number.isFinite(parsedWeight) ||
        parsedWeight <= 0 ||
        parsedWeight > 120)
    ) {
      setError(
        "Informe um peso maior que zero e de até 120 kg, por exemplo 31,4.",
      );
      return;
    }
    if (!isValidDateKey(date) || date > todayKey()) {
      setError("Informe uma data válida para o momento, até hoje.");
      return;
    }
    const payload = {
      petId: pet.id,
      date,
      text: text.trim(),
      photo,
      tags,
      place: place.trim() || null,
      weightKg: parsedWeight,
      visibility,
    };
    submitting.current = true;
    setSaving(true);
    try {
      if (editing) await updateDiaryEntry(editing.id, payload);
      else await addDiaryEntry(payload);
      toast.success(editing ? "Momento atualizado" : "Momento guardado", {
        description:
          "Este registro fica neste aparelho; não é publicado na comunidade.",
      });
      draft.clearDraft();
      draft.setValue(initialDraft);
      setOpen(false);
      resetForm();
    } catch {
      setError(
        "Não foi possível guardar o momento. Seu texto continua preenchido para tentar novamente.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function cancel() {
    if (submitting.current) return;
    draft.clearDraft();
    draft.setValue(initialDraft);
    setPhoto(editing?.photo ?? null);
    setOpen(false);
    setError(null);
  }

  if (!ready) return <SkeletonScreen label="Abrindo o diário" />;

  if (!pet) {
    return (
      <EmptyState
        title="Pet não encontrado"
        description="Esse perfil pode ter sido removido deste aparelho."
        action={<ButtonLink href="/pets">Voltar</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <CareHeader
        active="diario"
        pet={pet}
        context={
          <PetContextSwitcher
            scope={pet.id}
            onScopeChange={(scope) => {
              if (scope !== "todos" && scope !== pet.id)
                router.push(`/pets/${scope}/diary`);
            }}
          />
        }
        action={
          <Button size="sm" onClick={openNew}>
            <Plus aria-hidden="true" className="size-4" />
            Novo momento
          </Button>
        }
      />

      <p className="flex items-start gap-2 text-meta text-muted">
        <Lock
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-teal-ink"
        />
        O diário é privado por padrão. Informações de saúde nunca são
        publicadas automaticamente na comunidade.
      </p>

      {entries.length === 0 ? (
        <EmptyState
          icon={<NotebookPen aria-hidden="true" className="size-5" />}
          title="Comece pelo momento de hoje"
          description="“Primeiro banho no pet shop novo.”, “31,4 kg — controle mensal.”, “Hoje aprendeu a sentar.”"
          action={
            <Button variant="secondary" onClick={openNew}>
              Guardar primeiro momento
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <article className="flex flex-col gap-2 rounded-feature border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-2">
                  <time className="text-meta text-muted" dateTime={entry.date}>
                    {formatFullDate(entry.date)}
                  </time>
                  <Chip
                    tone={entry.visibility === "privado" ? "muted" : "teal"}
                  >
                    {entry.visibility === "privado" ? (
                      <EyeOff aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Eye aria-hidden="true" className="size-3.5" />
                    )}
                    {entry.visibility === "privado" ? "Só você" : "Público"}
                  </Chip>
                </div>

                {entry.photo ? (
                  <Photo
                    src={entry.photo}
                    alt={entry.text.slice(0, 80)}
                    className="w-full rounded-card"
                  />
                ) : null}

                <p className="text-body leading-relaxed text-ink-soft">
                  {entry.text}
                </p>

                {entry.tags.length > 0 || entry.place || entry.weightKg ? (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.weightKg ? (
                      <Chip tone="mint">{entry.weightKg} kg</Chip>
                    ) : null}
                    {entry.place ? (
                      <Chip tone="muted">{entry.place}</Chip>
                    ) : null}
                    {entry.tags.map((tag) => (
                      <Chip key={tag} tone="muted">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(entry)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={removal.pending}
                    onClick={() => {
                      void removal.run(async () => {
                        await removeDiaryEntry(entry.id);
                        toast.success("Momento excluído", {
                          action: {
                            label: "Desfazer",
                            onClick: () =>
                              void useAppStore.getState().restoreDeleted({
                                collection: "diary",
                                item: entry,
                              }),
                          },
                        });
                      });
                    }}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Excluir
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={open}
        onClose={() => {
          if (!submitting.current) setOpen(false);
        }}
        title={editing ? "Editar momento" : "Novo momento"}
        description={`${pet.name} · o que aconteceu hoje?`}
      >
        <fieldset
          disabled={saving}
          className="flex max-h-[70vh] min-w-0 flex-col gap-4 overflow-y-auto"
        >
          {draft.restored || draft.storageError ? (
            <p
              role="status"
              className="rounded-card border border-line bg-surface px-4 py-3 text-meta text-ink-soft"
            >
              {draft.storageError ??
                "Rascunho recuperado nesta aba. Se havia uma nova foto, selecione-a novamente."}
            </p>
          ) : null}
          <PhotoPicker photo={photo} name={pet.name} onChange={setPhoto} />

          <Field label="O que aconteceu?" htmlFor="diary-text" error={error}>
            <Textarea
              id="diary-text"
              value={text}
              onChange={(event) => setField("text", event.target.value)}
              placeholder="Passeio no parque com o amigo dele."
              maxLength={800}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            <Field label="Data" htmlFor="diary-date">
              <Input
                id="diary-date"
                type="date"
                max={todayKey()}
                value={date}
                onChange={(event) => setField("date", event.target.value)}
              />
            </Field>
            <Field label="Peso" htmlFor="diary-weight" hint="Opcional">
              <Input
                id="diary-weight"
                inputMode="decimal"
                value={weight}
                onChange={(event) => setField("weight", event.target.value)}
                placeholder="31,4"
              />
            </Field>
          </div>

          <Field label="Lugar" htmlFor="diary-place" hint="Opcional">
            <Input
              id="diary-place"
              value={place}
              onChange={(event) => setField("place", event.target.value)}
              placeholder="Parque das Figueiras"
              maxLength={80}
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-label font-medium text-ink">
              Marcadores
            </legend>
            <div className="flex flex-wrap gap-2">
              {tagSuggestions.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setField(
                        "tags",
                        selected
                          ? tags.filter((item) => item !== tag)
                          : [...tags, tag].slice(0, 8),
                      )
                    }
                    className={`min-h-11 rounded-full border px-3 text-label font-medium ${
                      selected
                        ? "border-teal-ink bg-teal-ink text-white"
                        : "border-line bg-paper text-ink-soft"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-label font-medium text-ink">
              Visibilidade desejada
            </legend>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <button
                type="button"
                aria-pressed={visibility === "privado"}
                onClick={() => setField("visibility", "privado")}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-card border text-label font-medium ${
                  visibility === "privado"
                    ? "border-teal-ink bg-mint text-teal-ink"
                    : "border-line bg-paper text-ink-soft"
                }`}
              >
                <EyeOff aria-hidden="true" className="size-4" />
                Só você
              </button>
              <button
                type="button"
                aria-pressed={visibility === "publico"}
                onClick={() => setField("visibility", "publico")}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-card border text-label font-medium ${
                  visibility === "publico"
                    ? "border-teal-ink bg-mint text-teal-ink"
                    : "border-line bg-paper text-ink-soft"
                }`}
              >
                <Eye aria-hidden="true" className="size-4" />
                Perfil (prévia)
              </button>
            </div>
          </fieldset>
          <p className="text-meta text-muted">
            O diário fica neste aparelho. A opção de perfil marca sua
            preferência; não publica este conteúdo na internet.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={save}>
              {saving
                ? "Guardando…"
                : editing
                  ? "Salvar alterações"
                  : "Guardar momento"}
            </Button>
            <Button size="lg" variant="secondary" onClick={cancel}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      </BottomSheet>
    </div>
  );
}
