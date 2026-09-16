"use client";

import { Bell, BellOff, Check, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { PageHeader } from "@/components/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { relativeTimeLabel } from "@/lib/domain/dates";
import { notificationKindMeta } from "@/lib/domain/labels";
import { notificationIcons } from "@/lib/icons";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

export default function NotificationsPage() {
  const ready = useHydrated();
  const notifications = useAppStore((state) => state.notifications);
  const markNotificationRead = useAppStore(
    (state) => state.markNotificationRead,
  );
  const dismissNotification = useAppStore((state) => state.dismissNotification);
  const clearNotifications = useAppStore((state) => state.clearNotifications);
  const track = useAppStore((state) => state.track);

  const visible = useMemo(
    () =>
      notifications
        .filter((item) => !item.dismissed)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifications],
  );

  if (!ready) return <SkeletonScreen label="Carregando notificações" />;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader
        title="Notificações"
        subtitle="Um cuidado, uma chamada para ação."
        action={
          visible.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={clearNotifications}>
              Limpar
            </Button>
          ) : undefined
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<BellOff aria-hidden="true" className="size-5" />}
          title="Nada pendente"
          description="Avisos de prevenção, rotina e novidades locais aparecem aqui. Escolha o que quer receber no seu perfil."
          action={<ButtonLink href="/profile">Ajustar preferências</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => {
            const Icon = notificationIcons[item.kind];
            const unread = !item.readAt;
            return (
              <li key={item.id}>
                <Card
                  className={`flex flex-col gap-2 ${unread ? "border-teal/30 bg-mint/40" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-ink shadow-card">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.98rem] font-semibold text-ink">
                          {item.title}
                        </p>
                        <Chip
                          tone={item.kind === "comercial" ? "warning" : "muted"}
                        >
                          {notificationKindMeta[item.kind].label}
                        </Chip>
                      </div>
                      <p className="text-[0.9rem] text-ink-soft/90">
                        {item.body}
                      </p>
                      <p className="mt-0.5 text-meta text-muted">
                        {relativeTimeLabel(item.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => {
                          markNotificationRead(item.id);
                          track("notification_opened", { kind: item.kind });
                        }}
                        className="inline-flex min-h-9 items-center rounded-full bg-teal-ink px-3 text-[0.85rem] font-medium text-white"
                      >
                        Ver agora
                      </Link>
                    ) : null}
                    {unread ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markNotificationRead(item.id)}
                      >
                        <Check aria-hidden="true" className="size-4" />
                        Marcar como lida
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Dispensar notificação"
                      onClick={() => dismissNotification(item.id)}
                    >
                      <X aria-hidden="true" className="size-4" />
                      Dispensar
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="flex items-start gap-3">
        <Bell
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-teal-ink"
        />
        <p className="text-meta text-muted">
          Notificações comerciais são identificadas e vêm desligadas por padrão.
          Você controla cada tipo no seu perfil.
        </p>
      </Card>
    </div>
  );
}
