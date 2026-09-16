"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

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
          <Dialog.Popup className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[28px] border border-line bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float outline-none transition-[opacity,transform] duration-200 data-[ending-style]:translate-y-6 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-6 data-[starting-style]:opacity-0 sm:rounded-[28px] sm:p-7">
            <div
              aria-hidden="true"
              className="mx-auto mb-5 h-1 w-10 rounded-full bg-line sm:hidden"
            />
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="text-xl font-bold text-ink">
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
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface text-muted hover:text-ink"
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
