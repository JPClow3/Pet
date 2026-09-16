"use client";

import { Radio, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { postTypeMeta } from "@/lib/domain/labels";
import type { PostType } from "@/lib/domain/schema";
import { postTypeIcons } from "@/lib/icons";
import { useAppStore } from "@/lib/store/app-store";
import { useActivePet } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

const types = Object.keys(postTypeMeta) as PostType[];

export default function NewPostPage() {
  const router = useRouter();
  const pet = useActivePet();
  const groups = useAppStore((state) => state.groups);
  const addPost = useAppStore((state) => state.addPost);

  const [type, setType] = useState<PostType>("pergunta");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title="Nova publicação"
        subtitle="Contexto ajuda quem responde."
        backHref="/community"
      />

      <section className="flex items-start gap-3 border-l-4 border-l-blue bg-blue-soft px-4 py-3">
        <Radio
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-blue"
        />
        <p className="text-meta leading-relaxed text-ink-soft/85">
          Você está publicando em uma prévia local. A tela nunca adiciona dados
          de saúde ou sua localização exata automaticamente.
        </p>
      </section>

      <Card className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[0.85rem] font-medium text-ink">
            Tipo
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {types.map((item) => {
              const Icon = postTypeIcons[item];
              const selected = type === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setType(item)}
                  className={cn(
                    "flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-left text-[0.88rem] font-medium",
                    selected
                      ? "border-blue bg-blue-soft text-blue-deep"
                      : "border-line bg-white text-ink-soft",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {postTypeMeta[item].label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Field label="Título" htmlFor="post-title" error={error}>
          <Input
            id="post-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              type === "pergunta"
                ? "Veterinário de madrugada perto de casa?"
                : type === "recomendacao"
                  ? "Parque com área cercada no bairro"
                  : "Título da publicação"
            }
            maxLength={120}
          />
        </Field>

        <Field
          label="Conteúdo"
          htmlFor="post-body"
          hint="Sem dados sensíveis de contato"
        >
          <Textarea
            id="post-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1200}
            className="min-h-32"
            placeholder="Descreva a situação com o máximo de contexto: porte, idade, bairro, horário."
          />
        </Field>

        <Field
          label="Grupo"
          htmlFor="post-group"
          hint="Ajuda a chegar em quem tem o mesmo contexto"
        >
          <Select
            id="post-group"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            <option value="">Sem grupo</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </Field>

        {pet ? (
          <p className="text-meta text-muted">
            Vai aparecer como {pet.name ? `tutor de ${pet.name}` : "tutor"} na
            comunidade. Dados de saúde do diário nunca são publicados
            automaticamente.
          </p>
        ) : null}

        <p className="flex items-start gap-2 border-l-2 border-sun bg-sun-soft px-3 py-2.5 text-meta leading-relaxed text-warning-ink">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Experiências da comunidade não são orientação veterinária. Em caso de
          sintomas ou dúvida, procure um profissional.
        </p>

        <div className="flex gap-2">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => {
              if (title.trim().length === 0 || body.trim().length === 0) {
                setError("Preencha título e conteúdo para publicar.");
                return;
              }
              setError(null);
              addPost({
                petName: pet?.name ?? null,
                type,
                groupId: groupId || null,
                title: title.trim(),
                body: body.trim(),
                city: pet ? null : "São Paulo",
              });
              toast.success("Publicação criada");
              router.replace("/community");
            }}
          >
            Publicar
          </Button>
          <Button size="lg" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </Card>

      <Card className="text-meta text-muted">
        Ao publicar, você concorda com as regras da comunidade: sem spam, sem
        indicação de medicamento e sem julgamento sobre a tutela de outras
        pessoas.
      </Card>
    </div>
  );
}
