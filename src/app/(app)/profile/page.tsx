"use client";

import {
  BadgeCheck,
  Download,
  LogOut,
  Lock,
  PawPrint,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CheckboxRow, Field, Input } from "@/components/ui/field";
import { relativeTimeLabel } from "@/lib/domain/dates";
import { notificationKindMeta, focusAreaLabels } from "@/lib/domain/labels";
import {
  ANALYTICS_EVENT_LABELS,
  type AnalyticsEventName,
} from "@/lib/domain/analytics";
import type { NotificationKind } from "@/lib/domain/schema";
import { useAppStore, exportSnapshot } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const notificationKinds = Object.keys(
  notificationKindMeta,
) as NotificationKind[];

export default function ProfilePage() {
  const ready = useHydrated();
  const router = useRouter();
  const tutor = useAppStore((state) => state.tutor);
  const pets = useAppStore((state) => state.pets);
  const settings = useAppStore((state) => state.settings);
  const blockedAuthorIds = useAppStore((state) => state.blockedAuthorIds);
  const events = useAppStore((state) => state.events);
  const updateTutor = useAppStore((state) => state.updateTutor);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const unblockAuthor = useAppStore((state) => state.unblockAuthor);
  const resetAll = useAppStore((state) => state.resetAll);

  const [name, setName] = useState(tutor?.name ?? "");
  const [email, setEmail] = useState(tutor?.email ?? "");
  const [city, setCity] = useState(tutor?.city ?? settings.city);

  const recentEvents = useMemo(() => events.slice(0, 8), [events]);

  if (!ready) return null;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader
        title="Perfil"
        subtitle="Conta, preferências e privacidade."
      />

      <Card className="flex flex-col gap-4 border-blue/20 bg-blue-soft/70">
        <CardTitle>Sua conta</CardTitle>
        <Field label="Nome" htmlFor="tutor-name">
          <Input
            id="tutor-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
          />
        </Field>
        <Field label="E-mail" htmlFor="tutor-email" hint="Opcional">
          <Input
            id="tutor-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={120}
          />
        </Field>
        <Field
          label="Cidade"
          htmlFor="tutor-city"
          hint="Define os lugares e grupos sugeridos"
        >
          <Input
            id="tutor-city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            maxLength={60}
          />
        </Field>
        <Button
          variant="blue"
          onClick={() => {
            updateTutor({
              name: name.trim() || "Tutor",
              email: email.trim() || null,
              city: city.trim(),
            });
            toast.success("Dados atualizados");
          }}
        >
          Salvar alterações
        </Button>
        {tutor?.focusAreas.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tutor.focusAreas.map((area) => (
              <Chip key={area} tone="mint">
                {focusAreaLabels[area]}
              </Chip>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-2 border-0 bg-sun-soft">
        <CardTitle>Seus pets</CardTitle>
        {pets.length === 0 ? (
          <p className="text-meta text-muted">Nenhum pet cadastrado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {pets.map((pet) => (
              <li key={pet.id} className="flex items-center gap-2">
                <PawPrint aria-hidden="true" className="size-4 text-teal-ink" />
                <Link
                  href="/pets"
                  className="flex-1 text-[0.95rem] text-ink-soft"
                >
                  {pet.name}
                </Link>
                <Link
                  href={`/pets/${pet.id}/edit`}
                  className="text-meta font-medium text-teal-ink"
                >
                  Editar
                </Link>
              </li>
            ))}
          </ul>
        )}
        <ButtonLink
          href="/pets/new"
          variant="secondary"
          size="sm"
          className="self-start"
        >
          Adicionar pet
        </ButtonLink>
      </Card>

      <Card className="flex flex-col gap-1 border-l-4 border-l-violet">
        <CardTitle>O que você quer receber</CardTitle>
        <p className="text-meta text-muted">
          A regra é simples: um cuidado, uma chamada para ação. Você controla
          cada tipo.
        </p>
        {notificationKinds.map((kind) => (
          <CheckboxRow
            key={kind}
            id={`notify-${kind}`}
            label={notificationKindMeta[kind].label}
            description={
              kind === "comercial"
                ? `${notificationKindMeta[kind].description} (conteúdo identificado como comercial)`
                : notificationKindMeta[kind].description
            }
            checked={settings.notifications[kind]}
            onChange={(checked) =>
              updateSettings({
                notifications: { ...settings.notifications, [kind]: checked },
              })
            }
          />
        ))}
      </Card>

      <Card className="flex flex-col gap-1 border-0 bg-lime-soft">
        <CardTitle>Privacidade</CardTitle>
        <CheckboxRow
          id="marketing-opt-in"
          label="Aceito receber ofertas de parceiros"
          description="Opt-in explícito. Sem isso, nenhuma comunicação comercial é criada."
          checked={tutor?.marketingOptIn ?? false}
          onChange={(checked) => updateTutor({ marketingOptIn: checked })}
        />
        <CheckboxRow
          id="precise-location"
          label="Usar minha localização precisa"
          description="Mostra distâncias reais no Explorar. Você pode desligar quando quiser."
          checked={settings.usePreciseLocation}
          onChange={(checked) =>
            updateSettings({ usePreciseLocation: checked })
          }
        />
        <p className="flex items-start gap-2 pt-2 text-meta text-muted">
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Dados de saúde ficam separados do conteúdo social. Nada do diário é
          publicado automaticamente na comunidade.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Chip tone="mint">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Perfil público separado
          </Chip>
          <Chip tone="mint">
            <BadgeCheck aria-hidden="true" className="size-3.5" />
            Contato sob seu controle
          </Chip>
        </div>
      </Card>

      {blockedAuthorIds.length > 0 ? (
        <Card className="flex flex-col gap-2">
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Users aria-hidden="true" className="size-4 text-teal-ink" />
              Usuários bloqueados
            </span>
          </CardTitle>
          <ul className="flex flex-col gap-1">
            {blockedAuthorIds.map((authorId) => (
              <li
                key={authorId}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-[0.9rem] text-ink-soft">{authorId}</span>
                <button
                  type="button"
                  onClick={() => {
                    unblockAuthor(authorId);
                    toast("Usuário desbloqueado");
                  }}
                  className="text-meta font-medium text-teal-ink"
                >
                  Desbloquear
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-2">
        <CardTitle>Assinatura</CardTitle>
        <p className="flex items-center gap-2 text-[0.95rem] text-ink-soft">
          Plano atual: <Chip tone="teal">Gratuito</Chip>
        </p>
        <p className="text-meta text-muted">
          Os dados essenciais do pet ficam sempre no plano gratuito. Recursos
          avançados (relatórios, múltiplos tutores e alertas inteligentes)
          entram depois, sem bloquear o básico.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Seus dados</CardTitle>
        <p className="text-meta text-muted">
          Tudo fica neste aparelho. Você pode levar seus dados ou apagar tudo a
          qualquer momento.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const blob = new Blob([exportSnapshot()], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "pethub-dados.json";
              anchor.click();
              URL.revokeObjectURL(url);
              toast.success("Download iniciado", {
                description: "Arquivo com pets, registros, lembretes e diário.",
              });
            }}
          >
            <Download aria-hidden="true" className="size-4" />
            Exportar meus dados
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (
                !window.confirm(
                  "Excluir a conta e apagar todos os dados deste aparelho? Essa ação não pode ser desfeita.",
                )
              ) {
                return;
              }
              resetAll();
              toast.success("Dados apagados");
              router.replace("/welcome");
            }}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Excluir conta
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            useAppStore.setState({ tutor: null });
            router.replace("/welcome");
          }}
        >
          <LogOut aria-hidden="true" className="size-4" />
          Sair da conta neste aparelho
        </Button>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle>Como o app está sendo usado</CardTitle>
        <p className="text-meta text-muted">
          Eventos guardados só neste aparelho, para entender o que faz sentido
          manter.
        </p>
        <ul className="flex flex-col gap-1">
          {recentEvents.map((event) => (
            <li
              key={`${event.name}-${event.at}`}
              className="flex items-center justify-between gap-2 text-meta"
            >
              <span className="text-ink-soft">
                {ANALYTICS_EVENT_LABELS[event.name as AnalyticsEventName] ??
                  event.name}
              </span>
              <span className="text-muted">{relativeTimeLabel(event.at)}</span>
            </li>
          ))}
          {recentEvents.length === 0 ? (
            <li className="text-meta text-muted">
              Nenhum evento registrado ainda.
            </li>
          ) : null}
        </ul>
      </Card>

      <Card className="flex items-start gap-3">
        <Smartphone
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-teal-ink"
        />
        <p className="text-meta text-muted">
          Adicione o PetHub à tela inicial para abrir como app e continuar
          funcionando sem internet. No iOS: Compartilhar → Adicionar à Tela de
          Início. No Android: menu → Instalar aplicativo.
        </p>
      </Card>
    </div>
  );
}
