"use client";

import {
  BadgeCheck,
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

import { BackupPanel } from "@/components/backup-panel";
import { PageHeader } from "@/components/page-header";
import { StoragePanel } from "@/components/storage-panel";
import { ThemeSetting } from "@/components/theme-provider";
import { PushSettingsPanel } from "@/components/push-settings-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { countLabel, useConfirm } from "@/components/ui/confirm-sheet";
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
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";
import { useAsyncAction } from "@/lib/use-async-action";

const notificationKinds = Object.keys(
  notificationKindMeta,
) as NotificationKind[];

export default function ProfilePage() {
  const ready = useHydrated();
  const tutor = useAppStore((state) => state.tutor);
  if (!ready) return null;
  return <ProfileContent key={tutor?.createdAt ?? "local"} />;
}

function ProfileContent() {
  const ready = useHydrated();
  const router = useRouter();
  const tutor = useAppStore((state) => state.tutor);
  const pets = useAppStore((state) => state.pets);
  const activePetId = useAppStore((state) => state.activePetId);
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
  const action = useAsyncAction();
  const [confirm, confirmSheet] = useConfirm();

  const recentEvents = useMemo(() => events.slice(0, 8), [events]);

  if (!ready) return null;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <fieldset disabled={action.pending} className="contents">
        <PageHeader
          title="Perfil"
          subtitle="Seu perfil, seus pets e suas preferências."
        />

        <Card className="flex flex-col gap-3">
          <CardTitle>Conta e recuperação</CardTitle>
          <p className="text-meta leading-relaxed text-muted">
            Conecte uma conta para guardar uma cópia na nuvem ou recuperar seus
            pets em outro aparelho. Você escolhe quando sincronizar.
          </p>
          <ButtonLink href="/account" variant="secondary">
            Gerenciar conta e nuvem
          </ButtonLink>
        </Card>

        <Card className="flex flex-col gap-4">
          <CardTitle>Perfil neste aparelho</CardTitle>
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
            onClick={() => {
              void action.run(async () => {
                await updateTutor({
                  name: name.trim() || "Tutor",
                  email: email.trim() || null,
                  city: city.trim(),
                });
                toast.success("Dados atualizados");
              });
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

        <Card className="flex flex-col gap-3">
          <CardTitle>Seus pets</CardTitle>
          {pets.length === 0 ? (
            <p className="text-meta text-muted">Nenhum pet cadastrado ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {pets.map((pet) => (
                <li key={pet.id} className="flex items-center gap-2">
                  <PawPrint
                    aria-hidden="true"
                    className="size-4 text-teal-ink"
                  />
                  <Link
                    href={`/pets/${pet.id}`}
                    className="flex min-h-11 flex-1 items-center text-body text-ink-soft"
                  >
                    {pet.name}
                  </Link>
                  <Link
                    href={`/pets/${pet.id}/edit`}
                    className="inline-flex min-h-11 items-center px-2 text-meta font-medium text-teal-ink"
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

        <Card className="flex flex-col gap-3">
          <CardTitle>O que você quer receber</CardTitle>
          <p className="text-meta text-muted">
            A regra é simples: um cuidado, uma chamada para ação. Você controla
            cada tipo.
          </p>
          <div className="flex flex-col gap-1">
            {notificationKinds.map((kind) => (
              <CheckboxRow
                key={kind}
                id={`notify-${kind}`}
                label={notificationKindMeta[kind].label}
                description={notificationKindMeta[kind].description}
                checked={settings.notifications[kind]}
                onChange={(checked) =>
                  void action.run(async () => {
                    await updateSettings({
                      notifications: {
                        ...settings.notifications,
                        [kind]: checked,
                      },
                    });
                    if (kind === "comercial")
                      await updateTutor({ marketingOptIn: checked });
                  })
                }
              />
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>Privacidade</CardTitle>
          <div className="flex flex-col gap-1">
            <CheckboxRow
              id="precise-location"
              label="Usar minha localização precisa"
              description="Mostra distâncias reais no Explorar. Você pode desligar quando quiser."
              checked={settings.usePreciseLocation}
              onChange={(checked) =>
                void action.run(() =>
                  updateSettings({ usePreciseLocation: checked }),
                )
              }
            />
          </div>
          <p className="flex items-start gap-2 pt-1 text-meta text-muted">
            <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Dados de saúde ficam separados do conteúdo social. Nada do diário é
            publicado automaticamente na comunidade.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Chip tone="muted">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Perfil público separado
            </Chip>
            <Chip tone="muted">
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
                  <span className="text-label text-ink-soft">{authorId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void action.run(async () => {
                        await unblockAuthor(authorId);
                        toast("Usuário desbloqueado");
                      });
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

        <PushSettingsPanel />

        <StoragePanel
          documentsHref={
            pets.length
              ? `/pets/${pets.find((pet) => pet.id === activePetId)?.id ?? pets[0].id}/documents`
              : undefined
          }
        />

        <Card id="local-backup" className="flex scroll-mt-6 flex-col gap-3">
          <CardTitle>Seus dados</CardTitle>
          <p className="text-meta text-muted">
            Sem sincronização ativada, tudo fica neste navegador. Apagar os
            dados do navegador remove seus registros. Faça backups e restaure
            quando precisar. Você pode apagar a cópia local a qualquer momento.
          </p>
          <div className="flex flex-wrap gap-2">
            <BackupPanel onRestored={() => router.refresh()} />
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>Aparência</CardTitle>
          <p className="text-meta text-muted">
            Automático acompanha o modo claro ou escuro do aparelho.
          </p>
          <ThemeSetting />
        </Card>

        {process.env.NODE_ENV !== "production" ? (
          <Card className="flex flex-col gap-2">
            <CardTitle>Como o app está sendo usado</CardTitle>
            <p className="text-meta text-muted">
              Eventos guardados só neste aparelho, para entender o que faz
              sentido manter.
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
                  <span className="text-muted">
                    {relativeTimeLabel(event.at)}
                  </span>
                </li>
              ))}
              {recentEvents.length === 0 ? (
                <li className="text-meta text-muted">
                  Nenhum evento registrado ainda.
                </li>
              ) : null}
            </ul>
          </Card>
        ) : null}

        <Card className="flex items-start gap-3">
          <Smartphone
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-teal-ink"
          />
          <p className="text-meta text-muted">
            Adicione a Zelupi à tela inicial para abrir como app e continuar
            funcionando sem internet. No iOS: Compartilhar → Adicionar à Tela de
            Início. No Android: menu → Instalar aplicativo.
          </p>
        </Card>

        <Card className="flex flex-col gap-3 border-danger/30">
          <CardTitle className="text-danger-ink">Zona de perigo</CardTitle>
          <p className="text-meta text-muted">
            Apaga pets, registros e documentos deste aparelho. Baixe um backup
            antes.
          </p>
          <Button
            variant="danger"
            onClick={async () => {
              const state = useAppStore.getState();
              const confirmed = await confirm({
                title: "Apagar todos os dados deste aparelho?",
                description:
                  "Não dá para desfazer. Baixe um backup antes, se quiser guardar.",
                consequences: [
                  countLabel(state.pets.length, "pet", "pets"),
                  countLabel(
                    state.records.length,
                    "registro de saúde",
                    "registros de saúde",
                  ),
                  countLabel(state.reminders.length, "lembrete", "lembretes"),
                  countLabel(
                    state.diary.length,
                    "momento do diário",
                    "momentos do diário",
                  ),
                  countLabel(
                    state.documents.filter((document) => !document.deletedAt)
                      .length,
                    "documento",
                    "documentos",
                  ),
                ],
                confirmLabel: "Apagar tudo",
              });
              if (!confirmed) return;
              void action.run(async () => {
                await resetAll();
                toast.success("Dados apagados");
                router.replace("/welcome");
              });
            }}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Apagar dados locais
          </Button>
        </Card>
      </fieldset>
      {confirmSheet}
    </div>
  );
}
