import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[14px] font-semibold transition-[background-color,box-shadow,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-teal-ink text-white hover:bg-teal-deep",
        secondary: "border border-line bg-white text-ink hover:bg-surface",
        mint: "bg-mint text-teal-ink hover:bg-mint/70",
        blue: "bg-blue text-white hover:bg-blue-deep",
        coral: "bg-accent text-accent-contrast hover:bg-accent/85",
        sun: "bg-sun text-ink hover:bg-sun/80",
        ghost: "text-ink hover:bg-surface",
        danger: "bg-danger-ink text-white hover:bg-danger",
      },
      size: {
        md: "min-h-12 px-4 text-[0.95rem]",
        sm: "min-h-11 px-3 text-[0.85rem]",
        lg: "min-h-13 px-6 text-base",
        icon: "size-12 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
