"use client";

import { Eye, EyeOff, Lock, NotebookPen, Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { CareTabs } from "@/components/care-tabs";
import { PetContextSwitcher } from "@/components/pet-header";
import { PhotoPicker } from "@/components/photo-picker";
import { Photo } from "@/components/ui/photo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { formatFullDate, todayKey } from "@/lib/domain/dates";
import type { DiaryEntry } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

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
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey());
  const [place, setPlace] = useState("");
  const [weight, setWeight] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"privado" | "publico">(
    "privado",
  );
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      diary
        .filter((entry) => entry.petId === params.petId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [diary, params.petId],
  );

  function resetForm() {
    setEditing(null);
    setText("");
    setPhoto(null);
    setDate(todayKey());
    setPlace("");
    setWeight("");
    setTags([]);
    setVisibility("privado");
    setError(null);
  }

  function openNew() {
    resetForm();
    setOpen(true);
  }

  function openEdit(entry: DiaryEntry) {
    setEditing(entry);
    setText(entry.text);
    setPhoto(entry.photo);
    setDate(entry.date);
    setPlace(entry.place ?? "");
    setWeight(entry.weightKg ? String(entry.weightKg) : "");
    setTags(entry.tags);
    setVisibility(entry.visibility);
    setError(null);
    setOpen(true);
  }

  function save() {
    if (!pet) return;
    if (text.trim().length === 0) {
      setError("Escreva pelo menos uma linha sobre esse momento.");
      return;
    }
    const parsedWeight =
      weight.trim() === "" ? null : Number(weight.replace(",", "."));
    if (
      parsedWeight !== null &&
      (Number.isNaN(parsedWeight) || parsedWeight <= 0)
    ) {
      setError("Informe o peso em quilos, por exemplo 31,4.");
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
    if (editing) {
      updateDiaryEntry(editing.id, payload);
      toast.success("Momento atualizado");
    } else {
      addDiaryEntry(payload);
      toast.success("Momento guardado", {
        description:
          visibility === "privado"
            ? "Só você vê este registro."
            : "Este registro aparece no seu perfil público.",
      });
    }
    setOpen(false);
    resetForm();
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
      <div className="flex items-center justify-between gap-3">
        <span className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
          Cuidados
        </span>
        <PetContextSwitcher
          scope={pet.id}
          onScopeChange={(scope) => {
            if (scope !== "todos" && scope !== pet.id)
              router.push(`/pets/${scope}/diary`);
          }}
        />
      </div>
      <CareTabs active="diario" pet={pet} />
      <PageHeader
        title="Diário"
        subtitle={`A história de ${pet.name}`}
        backHref="/pets"
        action={
          <Button size="sm" onClick={openNew}>
            <Plus aria-hidden="true" className="size-4" />
            Novo
          </Button>
        }
      />

      <Card className="flex items-start gap-3">
        <Lock
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-teal-ink"
        />
        <p className="text-meta text-muted">
          O diário é privado por padrão. Informações de saúde nunca são
          publicadas automaticamente na comunidade.
        </p>
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          icon={<NotebookPen aria-hidden="true" className="size-5" />}
          title="Comece pelo momento de hoje"
          description="“Primeiro banho no pet shop novo.”, “31,4 kg — controle mensal.”, “Hoje aprendeu a sentar.”"
          action={<Button onClick={openNew}>Guardar primeiro momento</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <article className="flex flex-col gap-2 rounded-3xl border border-line bg-white p-4">
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
                    className="w-full rounded-2xl"
                  />
                ) : null}

                <p className="text-[0.98rem] leading-relaxed text-ink-soft">
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
                    onClick={() => {
                      if (!window.confirm("Excluir este momento do diário?"))
                        return;
                      removeDiaryEntry(entry.id);
                      toast.success("Momento excluído");
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
        onClose={() => setOpen(false)}
        title={editing ? "Editar momento" : "Novo momento"}
        description={`${pet.name} · o que aconteceu hoje?`}
      >
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <PhotoPicker photo={photo} name={pet.name} onChange={setPhoto} />

          <Field label="O que aconteceu?" htmlFor="diary-text" error={error}>
            <Textarea
              id="diary-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Passeio no parque com o amigo dele."
              maxLength={800}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" htmlFor="diary-date">
              <Input
                id="diary-date"
                type="date"
                max={todayKey()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label="Peso" htmlFor="diary-weight" hint="Opcional">
              <Input
                id="diary-weight"
                inputMode="decimal"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="31,4"
              />
            </Field>
          </div>

          <Field label="Lugar" htmlFor="diary-place" hint="Opcional">
            <Input
              id="diary-place"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Parque das Figueiras"
              maxLength={80}
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[0.85rem] font-medium text-ink">
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
                      setTags((current) =>
                        selected
                          ? current.filter((item) => item !== tag)
                          : [...current, tag].slice(0, 8),
                      )
                    }
                    className={`min-h-9 rounded-full border px-3 text-[0.85rem] font-medium ${
                      selected
                        ? "border-teal-ink bg-teal-ink text-white"
                        : "border-line bg-white text-ink-soft"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[0.85rem] font-medium text-ink">
              Quem pode ver
            </legend>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={visibility === "privado"}
                onClick={() => setVisibility("privado")}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border text-[0.9rem] font-medium ${
                  visibility === "privado"
                    ? "border-teal-ink bg-mint text-teal-ink"
                    : "border-line bg-white text-ink-soft"
                }`}
              >
                <EyeOff aria-hidden="true" className="size-4" />
                Só você
              </button>
              <button
                type="button"
                aria-pressed={visibility === "publico"}
                onClick={() => setVisibility("publico")}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border text-[0.9rem] font-medium ${
                  visibility === "publico"
                    ? "border-teal-ink bg-mint text-teal-ink"
                    : "border-line bg-white text-ink-soft"
                }`}
              >
                <Eye aria-hidden="true" className="size-4" />
                Aparece no perfil
              </button>
            </div>
          </fieldset>

          <div className="flex gap-2">
            <Button size="lg" className="flex-1" onClick={save}>
              {editing ? "Salvar alterações" : "Guardar momento"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
