import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[20px] border border-line/80 bg-white px-5 py-8 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-subtle text-teal-ink">
          {icon}
        </span>
      ) : null}
      <h2 className="text-[1.05rem] font-semibold text-ink">{title}</h2>
      <p className="max-w-[38ch] text-[0.9rem] leading-relaxed text-muted">{description}</p>
      {action}
    </div>
  );
}
