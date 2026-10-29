import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PILOT_CITY_CENTER } from "@/lib/domain/seed";
import { useOrigin } from "@/lib/geo";
import { useAppStore } from "@/lib/store/app-store";

const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  "geolocation",
);
let requests: Array<{
  success: PositionCallback;
  failure: PositionErrorCallback | null;
}>;

describe("origem geográfica", () => {
  beforeEach(async () => {
    await useAppStore.setState(useAppStore.getInitialState(), true);
    requests = [];
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(
          (
            success: PositionCallback,
            failure: PositionErrorCallback | null,
          ) => {
            requests.push({ success, failure });
          },
        ),
      },
    });
  });

  afterEach(() => {
    if (originalGeolocation)
      Object.defineProperty(navigator, "geolocation", originalGeolocation);
    else Reflect.deleteProperty(navigator, "geolocation");
  });

  it("mostra a recusa e permite uma nova tentativa que conclui com sucesso", async () => {
    const { result } = renderHook(() => useOrigin());
    act(() => result.current.request());
    await waitFor(() => expect(requests).toHaveLength(1));
    act(() => requests[0].failure?.({ code: 1 } as GeolocationPositionError));
    expect(result.current.status).toBe("negado");
    expect(result.current.origin).toEqual(PILOT_CITY_CENTER);
    act(() => result.current.request());
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(result.current.status).toBe("carregando");
    act(() =>
      requests[1].success({
        coords: { latitude: -22, longitude: -47 },
      } as GeolocationPosition),
    );
    expect(result.current.status).toBe("precisa");
    expect(result.current.origin).toEqual({ lat: -22, lng: -47 });
    await act(async () => {
      await useAppStore
        .getState()
        .updateSettings({ usePreciseLocation: false });
    });
    expect(result.current.status).toBe("cidade");
    expect(result.current.origin).toEqual(PILOT_CITY_CENTER);
  });

  it("obtém novamente as coordenadas ao abrir com a preferência precisa já salva", async () => {
    await useAppStore.getState().updateSettings({ usePreciseLocation: true });
    const first = renderHook(() => useOrigin());
    await waitFor(() => expect(requests).toHaveLength(1));
    first.unmount();
    const reloaded = renderHook(() => useOrigin());
    await waitFor(() => expect(requests).toHaveLength(2));
    act(() =>
      requests[1].success({
        coords: { latitude: -22, longitude: -47 },
      } as GeolocationPosition),
    );
    expect(reloaded.result.current.origin).toEqual({ lat: -22, lng: -47 });
    expect(reloaded.result.current.status).toBe("precisa");
  });

  it("distingue falha de localização de permissão negada e ignora resposta após opt-out", async () => {
    const { result } = renderHook(() => useOrigin());
    act(() => result.current.request());
    await waitFor(() => expect(requests).toHaveLength(1));
    act(() => requests[0].failure?.({ code: 3 } as GeolocationPositionError));
    expect(result.current.status).toBe("indisponivel");
    act(() => result.current.request());
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => {
      await useAppStore
        .getState()
        .updateSettings({ usePreciseLocation: false });
    });
    act(() =>
      requests[1].success({
        coords: { latitude: -22, longitude: -47 },
      } as GeolocationPosition),
    );
    expect(result.current.origin).toEqual(PILOT_CITY_CENTER);
  });
});
