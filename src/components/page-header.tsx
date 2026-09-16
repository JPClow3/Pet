"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function BackLink({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="flex size-12 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface"
      aria-label="Voltar"
    >
      <ChevronLeft aria-hidden="true" className="size-5" />
    </button>
  );
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start gap-2">
      {backHref ? <BackLink fallbackHref={backHref} /> : null}
      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink lg:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-[0.9rem] text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  actionHref,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[1.05rem] font-semibold tracking-tight text-ink">
        {title}
      </h2>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="flex min-h-11 shrink-0 items-center text-meta font-semibold text-teal-ink"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
