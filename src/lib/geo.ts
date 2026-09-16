"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { PILOT_CITY_CENTER } from "@/lib/domain/seed";
import type { Coordinates } from "@/lib/domain/places";
import { useAppStore } from "@/lib/store/app-store";

export type OriginStatus = "cidade" | "carregando" | "negado";

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
  const supported = useGeolocationSupported();
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!usePreciseLocation || coords || !supported) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        if (cancelled) return;
        setDenied(true);
        updateSettings({ usePreciseLocation: false });
      },
      { timeout: 8000 },
    );
    return () => {
      cancelled = true;
    };
  }, [usePreciseLocation, coords, supported, updateSettings]);

  const status: OriginStatus =
    !usePreciseLocation || !supported
      ? "cidade"
      : denied
        ? "negado"
        : coords
          ? "cidade"
          : "carregando";

  return {
    origin: coords ?? PILOT_CITY_CENTER,
    status,
    request: () => updateSettings({ usePreciseLocation: true }),
  };
}
