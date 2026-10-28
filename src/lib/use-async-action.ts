"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

/** Keep local UI feedback behind the durable write and prevent duplicate actions. */
export function useAsyncAction() {
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      if (running.current) return false;
      running.current = true;
      setPending(true);
      try {
        await action();
        return true;
      } catch (cause) {
        toast.error("Não foi possível salvar", {
          description:
            cause instanceof Error
              ? cause.message
              : "Seus dados anteriores foram mantidos. Tente novamente.",
        });
        return false;
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    [],
  );
  return { run, pending };
}
