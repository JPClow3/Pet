"use client";

import { useState } from "react";
import {
  CalendarPlus,
  Calendar,
  Download,
  ExternalLink,
  Clock,
  MapPin,
  PawPrint,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { downloadText } from "@/lib/download";
import { formatShortDate } from "@/lib/domain/dates";
import {
  buildGoogleCalendarUrl,
  generateIcs,
  type CalendarEvent,
} from "@/lib/calendar";

export type AddToCalendarButtonProps = {
  event: CalendarEvent;
  variant?: "primary" | "secondary" | "brand" | "mint" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  showIcon?: boolean;
};

export function AddToCalendarButton({
  event,
  variant = "secondary",
  size = "sm",
  className,
  label = "Adicionar ao Calendário",
  showIcon = true,
}: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false);

  function handleGoogleCalendar() {
    const url = buildGoogleCalendarUrl(event);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
    toast.success("Abrindo Google Agenda…", {
      description: "Confirme a adição do evento na página que se abriu.",
    });
  }

  function handleIcsDownload() {
    const icsContent = generateIcs(event);
    const slug = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30)
      .replace(/-+$/, "");
    const filename = `${slug || "lembrete-zelupi"}-${event.startDate}.ics`;

    downloadText(icsContent, filename, "text/calendar;charset=utf-8");
    setOpen(false);
    toast.success("Arquivo de calendário (.ics) baixado!", {
      description:
        "Abra o arquivo para adicionar ao Apple Calendar, Outlook ou calendário padrão do seu celular com alarmes nativos.",
      duration: 6000,
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${event.title}`}
      >
        {showIcon ? (
          <CalendarPlus aria-hidden="true" className="size-4" />
        ) : null}
        <span>{label}</span>
      </Button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Adicionar ao Calendário"
        description={`${event.title} · ${formatShortDate(event.startDate)}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[0.92rem] leading-relaxed text-muted">
            Garanta que você receba alarmes nativos no celular mesmo com o
            aplicativo fechado. Escolha onde salvar o lembrete:
          </p>

          <Card className="flex flex-col gap-2.5 border-line/80 bg-surface/50 p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <PawPrint aria-hidden="true" className="size-4 text-teal-ink" />
              <span>{event.title}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-3.5" />
                <span>
                  {formatShortDate(event.startDate)}
                  {event.startTime ? ` às ${event.startTime}` : " (dia todo)"}
                </span>
              </span>
              {event.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  <span>{event.location}</span>
                </span>
              ) : null}
            </div>
            <p className="text-meta text-teal-ink">
              🔔 Inclui alarmes automáticos: 1 dia antes e 2 horas antes.
            </p>
          </Card>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleGoogleCalendar}
              className="flex min-h-12 w-full items-center justify-between rounded-[14px] border border-line bg-paper px-4 py-3 text-left transition-colors hover:border-teal-ink/40 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-surface text-ink">
                  <Calendar aria-hidden="true" className="size-4 text-teal-ink" />
                </span>
                <div>
                  <p className="text-[0.95rem] font-semibold text-ink">
                    Google Agenda
                  </p>
                  <p className="text-meta text-muted">
                    Salvar no Google Calendar (web ou aplicativo)
                  </p>
                </div>
              </div>
              <ExternalLink aria-hidden="true" className="size-4 text-muted" />
            </button>

            <button
              type="button"
              onClick={handleIcsDownload}
              className="flex min-h-12 w-full items-center justify-between rounded-[14px] border border-line bg-paper px-4 py-3 text-left transition-colors hover:border-teal-ink/40 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-surface text-ink">
                  <Download aria-hidden="true" className="size-4 text-teal-ink" />
                </span>
                <div>
                  <p className="text-[0.95rem] font-semibold text-ink">
                    Apple Calendar / Outros (.ics)
                  </p>
                  <p className="text-meta text-muted">
                    Baixar arquivo com alarmes nativos para iPhone, iPad, Android ou Mac
                  </p>
                </div>
              </div>
              <Download aria-hidden="true" className="size-4 text-muted" />
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

export function BulkAddToCalendarButton({
  events,
  filename = "agenda-cuidados-zelupi.ics",
  calendarName = "Zelupi — Agenda de Cuidados",
  label = "Exportar agenda (.ics)",
  variant = "secondary",
  size = "sm",
}: {
  events: CalendarEvent[];
  filename?: string;
  calendarName?: string;
  label?: string;
  variant?: "primary" | "secondary" | "brand" | "mint" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  function handleExport() {
    if (events.length === 0) {
      toast("Nenhum cuidado futuro encontrado para exportar.");
      return;
    }

    const icsContent = generateIcs(events, calendarName);
    downloadText(icsContent, filename, "text/calendar;charset=utf-8");

    toast.success(`${events.length} cuidados exportados!`, {
      description:
        "Importe o arquivo no seu calendário (Google, Apple ou celular) para ter os alarmes nativos ativados.",
      duration: 6000,
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={events.length === 0}
      aria-label={`${label} (${events.length} cuidados)`}
    >
      <Download aria-hidden="true" className="size-4" />
      <span>{label}</span>
    </Button>
  );
}
