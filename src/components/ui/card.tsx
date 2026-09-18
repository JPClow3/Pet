import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-[20px] border border-line/80 bg-white p-5 shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "text-[0.95rem] font-semibold tracking-tight text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardMeta({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-meta text-muted", className)} {...props} />;
}
