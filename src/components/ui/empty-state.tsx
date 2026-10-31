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
        "flex flex-col items-center gap-3 rounded-card border border-line/80 bg-paper px-5 py-8 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex items-center justify-center text-muted">
          {icon}
        </span>
      ) : null}
      <h2 className="text-h3 font-semibold text-ink">{title}</h2>
      <p className="max-w-[38ch] text-label leading-relaxed text-muted">{description}</p>
      {action}
    </div>
  );
}
