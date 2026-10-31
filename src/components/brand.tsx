import Link from "next/link";

import { brand, brandColors, brandMark } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={brandMark.viewBox}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("size-10 shrink-0", className)}
    >
      <rect width="64" height="64" rx="20" fill={brandColors.brand} />
      <path
        d={brandMark.path}
        stroke={brandColors.canvas}
        strokeWidth={brandMark.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle {...brandMark.dot} fill={brandColors.accent} />
    </svg>
  );
}

export function Brand({
  href = "/",
  className,
  compactOnTablet = false,
}: {
  href?: string;
  className?: string;
  compactOnTablet?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={`${brand.name}, início`}
      className={cn(
        "inline-flex min-h-12 shrink-0 items-center gap-2.5 rounded-xl text-ink transition-opacity hover:opacity-80",
        className,
      )}
    >
      <BrandMark />
      <span
        aria-hidden="true"
        className={cn(
          "text-h1 font-extrabold leading-none tracking-[-0.065em]",
          compactOnTablet && "md:hidden lg:inline",
        )}
      >
        {brand.wordmark}
      </span>
    </Link>
  );
}
