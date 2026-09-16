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
        "flex flex-col items-center gap-3 rounded-[1.75rem_1.75rem_3rem_1.75rem] border-2 border-dashed border-blue/25 bg-blue-soft/55 px-5 py-8 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-12 rotate-[-4deg] items-center justify-center rounded-[1rem] bg-sun text-blue-deep shadow-[3px_3px_0_var(--color-blue)]">
          {icon}
        </span>
      ) : null}
      <h2 className="text-[1.05rem] font-semibold text-ink">{title}</h2>
      <p className="max-w-[36ch] text-[0.9rem] text-muted">{description}</p>
      {action}
    </div>
  );
}
