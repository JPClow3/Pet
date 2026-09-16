import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChipTone = "teal" | "mint" | "warning" | "danger" | "ink" | "muted";

const toneClasses: Record<ChipTone, string> = {
  teal: "bg-teal/12 text-teal-ink",
  mint: "bg-mint text-teal-ink",
  warning: "bg-warning/18 text-warning-ink",
  danger: "bg-danger/15 text-danger-ink",
  ink: "bg-ink/8 text-ink",
  muted: "bg-surface text-ink-soft",
};

export const toneSurfaceClasses: Record<ChipTone, string> = {
  teal: "border-teal/25 bg-teal/8",
  mint: "border-teal/20 bg-mint/70",
  warning: "border-warning/40 bg-warning/10",
  danger: "border-danger/30 bg-danger/8",
  ink: "border-line bg-surface",
  muted: "border-line bg-white",
};

export function Chip({
  tone = "muted",
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: ChipTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-meta font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusChip({
  tone,
  icon,
  label,
}: {
  tone: ChipTone;
  icon?: ReactNode;
  label: string;
}) {
  return (
    <Chip tone={tone}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
    </Chip>
  );
}

export function FilterChip({
  selected,
  children,
  className,
  ...props
}: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.85rem] font-semibold transition-colors",
        selected
          ? "border-teal-ink bg-teal-ink text-white"
          : "border-line bg-white text-ink-soft hover:bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
