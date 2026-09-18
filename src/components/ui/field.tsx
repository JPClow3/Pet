import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[0.85rem] font-medium text-ink">
        {label}
      </label>
      {Children.map(children, (child) =>
        isValidElement(child) && htmlFor
          ? cloneElement(
              child as ReactElement<{
                "aria-describedby"?: string;
                "aria-invalid"?: boolean;
              }>,
              {
                "aria-describedby":
                  hint || error ? `${htmlFor}-description` : undefined,
                "aria-invalid": error ? true : undefined,
              },
            )
          : child,
      )}
      {hint && !error ? (
        <p
          id={htmlFor ? `${htmlFor}-description` : undefined}
          className="text-meta text-muted"
        >
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-description` : undefined}
          className="text-meta font-medium text-danger-ink"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlClasses =
  "w-full min-h-12 rounded-[14px] border border-line bg-white px-3.5 text-base text-ink-soft placeholder:text-muted/75 focus:border-teal-ink focus-visible:ring-2 focus-visible:ring-teal-ink/20 aria-invalid:border-danger-ink transition-colors";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        controlClasses,
        "min-h-24 py-2.5 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        className={cn(controlClasses, "appearance-none pr-10 cursor-pointer", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export function CheckboxRow({
  label,
  description,
  checked,
  onChange,
  id,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl px-1 py-2"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-teal-ink"
      />
      <span className="flex flex-col">
        <span className="text-[0.95rem] font-medium text-ink">{label}</span>
        {description ? (
          <span className="text-meta text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
