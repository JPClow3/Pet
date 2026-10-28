"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/** Owned Base UI overlay: mobile bottom sheet, desktop centered dialog. */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      const previous = previousFocusRef.current;
      if (
        previous &&
        typeof document !== "undefined" &&
        document.contains(previous)
      ) {
        previous.focus();
      }
      previousFocusRef.current = null;
      return;
    }

    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      previousFocusRef.current = document.activeElement;
    }

    const frame = requestAnimationFrame(() => {
      const popup = popupRef.current;
      if (!popup) return;
      const activeInside =
        typeof document !== "undefined" &&
        popup.contains(document.activeElement);
      if (!activeInside) {
        const firstFocusable =
          popup.querySelector<HTMLElement>("[data-autofocus]") ??
          popup.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
          titleRef.current;
        firstFocusable?.focus();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    return () => {
      const previous = previousFocusRef.current;
      if (
        previous &&
        typeof document !== "undefined" &&
        document.contains(previous)
      ) {
        previous.focus();
      }
    };
  }, []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[#0d1816]/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
          <Dialog.Popup
            ref={popupRef}
            className="relative max-h-[90dvh] w-full max-w-lg overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[28px] border border-line bg-paper px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float outline-none transition-[opacity,transform] duration-200 data-[ending-style]:translate-y-6 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-6 data-[starting-style]:opacity-0 sm:rounded-[28px] sm:p-7"
          >
            {open ? (
              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {`Painel aberto: ${title}`}
              </div>
            ) : null}
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden"
            />
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Dialog.Title
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-xl font-bold text-ink outline-none"
                >
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Fechar"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink"
              >
                <X aria-hidden="true" className="size-5" />
              </Dialog.Close>
            </div>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
