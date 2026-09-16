"use client";

import {
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { Chip, type ChipTone } from "@/components/ui/chip";
import { formatShortDate } from "@/lib/domain/dates";
import {
  healthStatus,
  sortByDateDesc,
  upcomingRecords,
} from "@/lib/domain/health";
import { healthTypeMeta } from "@/lib/domain/labels";
import { healthTypeIcons } from "@/lib/icons";
import type { HealthRecord } from "@/lib/domain/schema";
import { cn } from "@/lib/utils";

const stateTone: Record<string, ChipTone> = {
  vazio: "muted",
  em_dia: "teal",
  atencao: "warning",
  vencido: "danger",
};

const stateIcon = {
  vazio: Clock,
  em_dia: CircleCheck,
  atencao: TriangleAlert,
  vencido: CircleAlert,
} as const;

const stateLabel = {
  vazio: "Sem registros",
  em_dia: "Em dia",
  atencao: "Atenção",
  vencido: "Vencido",
} as const;

const stateSurface = {
  vazio: "border-line bg-white hover:border-teal/35",
  em_dia: "border-success-ink/30 bg-success-soft hover:border-success-ink/55",
  atencao: "border-warning/45 bg-warning-soft hover:border-warning-ink/65",
  vencido: "border-danger/35 bg-danger-soft hover:border-danger/60",
} as const;

export function HealthStatusCard({
  records,
  href,
  title = "Agenda de cuidados",
}: {
  records: HealthRecord[];
  href: string;
  title?: string;
}) {
  const status = healthStatus(records);
  const Icon = stateIcon[status.state];
  const tone = stateTone[status.state];
  const upcoming = upcomingRecords(records, new Date(), 3);

  return (
    <Link
      href={href}
      aria-label={`${title}: ${status.headline}`}
      data-state={status.state}
      className={cn(
        "group flex flex-col gap-3 rounded-[18px] border p-4 transition-[border-color,background-color,transform] duration-200 hover:bg-surface/45 active:scale-[0.995] sm:p-5",
        stateSurface[status.state],
      )}
    >
      <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-meta font-bold uppercase tracking-[0.12em] text-muted">
            {title}
          </span>
          <p className="mt-1 text-meta leading-snug text-muted">
            Status da agenda, não avaliação clínica
          </p>
        </div>
        <Chip
          tone={tone}
          className="shrink-0 whitespace-nowrap px-2.5 py-1 text-meta"
        >
          <Icon aria-hidden="true" className="size-3.5" />
          {stateLabel[status.state]}
        </Chip>
      </div>

      <div>
        <p className="text-[1.1rem] font-bold leading-snug text-ink">
          {status.headline}
        </p>
        <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-soft">
          {status.detail}
        </p>
      </div>

      {upcoming.length > 0 ? (
        <ul className="flex flex-col gap-2 border-t border-current/10 pt-3">
          {upcoming.map(({ record, days }) => {
            const RecordIcon = healthTypeIcons[record.type];
            return (
              <li
                key={record.id}
                className="flex min-w-0 items-center gap-2 text-meta text-ink-soft"
              >
                <RecordIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted"
                />
                <span className="min-w-0 flex-1 truncate">
                  {healthTypeMeta[record.type].label}: {record.title}
                </span>
                <span className="shrink-0 font-semibold text-muted">
                  {days < 0
                    ? `${Math.abs(days)} d atrás`
                    : formatShortDate(record.nextDueDate ?? "")}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <span className="text-meta font-bold text-teal-ink transition-transform group-hover:translate-x-0.5">
        Ver histórico e próximos cuidados →
      </span>
    </Link>
  );
}

export function RecordTimelineItem({ record }: { record: HealthRecord }) {
  const Icon = healthTypeIcons[record.type];
  const meta = healthTypeMeta[record.type];

  return (
    <div
      data-completed={record.completedAt ? "true" : undefined}
      className="group flex gap-3 rounded-[18px] px-2 py-1 transition-colors hover:bg-surface/70"
    >
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-surface text-ink-soft">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1 border-b border-line/80 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[0.95rem] font-semibold text-ink">
            {record.title}
          </p>
          <time
            className="shrink-0 text-meta tabular-nums text-muted"
            dateTime={record.date}
          >
            {formatShortDate(record.date)}
          </time>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-meta text-muted">
          <span>{meta.label}</span>
          {record.professional ? <span>· {record.professional}</span> : null}
          {record.weightKg ? <span>· {record.weightKg} kg</span> : null}
          {record.attachmentData ? (
            <span className="inline-flex items-center gap-1 text-teal-ink">
              · <FileText aria-hidden="true" className="size-3.5" /> Anexo
            </span>
          ) : null}
        </p>
        {record.notes ? (
          <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft/90">
            {record.notes}
          </p>
        ) : null}
        {record.nextDueDate ? (
          <p className="mt-1 text-meta font-semibold text-teal-ink">
            Próximo: {formatShortDate(record.nextDueDate)}
          </p>
        ) : null}
        {record.completedAt ? (
          <p className="mt-1 text-meta text-success-ink">Ciclo concluído</p>
        ) : null}
      </div>
    </div>
  );
}

export function sortedRecords(records: HealthRecord[]): HealthRecord[] {
  return sortByDateDesc(records);
}
