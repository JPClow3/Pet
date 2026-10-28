"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { PILOT_CITY_CENTER } from "@/lib/domain/seed";
import type { Coordinates } from "@/lib/domain/places";
import { useAppStore } from "@/lib/store/app-store";
import { useAsyncAction } from "@/lib/use-async-action";

export type OriginStatus =
  "cidade" | "precisa" | "carregando" | "negado" | "indisponivel";

const subscribeToNothing = () => () => {};

export function useGeolocationSupported(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => typeof navigator !== "undefined" && "geolocation" in navigator,
    () => false,
  );
}

export function useOriginUrl(): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => null,
  );
}

export function useOrigin(): {
  origin: Coordinates;
  status: OriginStatus;
  request: () => void;
} {
  const usePreciseLocation = useAppStore(
    (state) => state.settings.usePreciseLocation,
  );
  const updateSettings = useAppStore((state) => state.updateSettings);
  const action = useAsyncAction();
  const supported = useGeolocationSupported();
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [error, setError] = useState<"negado" | "indisponivel" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!usePreciseLocation || coords || !supported) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setError(null);
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (failure) => {
        if (cancelled) return;
        setError(failure.code === 1 ? "negado" : "indisponivel");
      },
      { timeout: 8000 },
    );
    return () => {
      cancelled = true;
    };
  }, [usePreciseLocation, coords, supported, attempt]);

  const status: OriginStatus = action.pending
    ? "carregando"
    : !usePreciseLocation
      ? "cidade"
      : !supported
        ? "indisponivel"
        : error
          ? error
          : coords
            ? "precisa"
            : "carregando";

  return {
    origin:
      usePreciseLocation && supported && coords ? coords : PILOT_CITY_CENTER,
    status,
    request: () => {
      void action.run(async () => {
        setError(null);
        setCoords(null);
        if (usePreciseLocation) setAttempt((current) => current + 1);
        else await updateSettings({ usePreciseLocation: true });
      });
    },
  };
}
