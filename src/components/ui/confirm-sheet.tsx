"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/sheet";

export type ConfirmOptions = {
  title: string;
  description?: string;
  /** What will be removed, e.g. ["12 registros de saúde", "3 documentos"]. */
  consequences?: string[];
  confirmLabel: string;
  cancelLabel?: string;
};

/**
 * Styled replacement for `window.confirm`: it lists what is affected and
 * works inside installed PWAs, where native dialogs can be blocked.
 *
 * const [confirm, confirmSheet] = useConfirm();
 * if (!(await confirm({ title, confirmLabel }))) return;
 */
export function useConfirm(): [
  (options: ConfirmOptions) => Promise<boolean>,
  ReactNode,
] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }

  const sheet = (
    <BottomSheet
      open={options !== null}
      onClose={() => settle(false)}
      title={options?.title ?? ""}
      description={options?.description}
    >
      {options?.consequences?.length ? (
        <div className="mb-5 rounded-card border border-danger/25 bg-danger-soft/50 p-3">
          <p className="text-label font-semibold text-danger-ink">
            Será apagado deste aparelho:
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-label text-ink">
            {options.consequences.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => settle(false)}
          data-autofocus
        >
          {options?.cancelLabel ?? "Cancelar"}
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          onClick={() => settle(true)}
        >
          {options?.confirmLabel}
        </Button>
      </div>
    </BottomSheet>
  );

  return [confirm, sheet];
}

/** "1 registro" / "3 registros": counts for consequence lists. */
export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
