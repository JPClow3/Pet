import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ChipTone =
  | "teal"
  | "mint"
  | "sun"
  | "warning"
  | "danger"
  | "success"
  | "info"
  | "ink"
  | "muted"
  | "violet";

const toneClasses: Record<ChipTone, string> = {
  teal: "border border-teal-ink/25 bg-mint text-teal-ink",
  mint: "border border-teal-deep/20 bg-mint text-teal-deep",
  sun: "border border-warning-ink/25 bg-sun-soft text-warning-ink",
  warning: "border border-warning-ink/30 bg-warning-soft text-warning-ink",
  danger: "border border-danger-ink/30 bg-danger-soft text-danger-ink",
  success: "border border-success-ink/30 bg-success-soft text-success-ink",
  info: "border border-info-ink/30 bg-info-soft text-info-ink",
  ink: "border border-ink bg-ink text-paper",
  muted: "border border-line/80 bg-surface text-ink-soft",
  violet: "border border-violet/25 bg-violet-soft text-violet",
};

export function Chip({
  tone = "muted",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-[0.76rem] font-semibold leading-tight",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function FilterChip({
  selected = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.82rem] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2",
        selected
          ? "border-brand bg-brand text-white"
          : "border-line bg-paper text-ink-soft hover:border-teal/50 hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
