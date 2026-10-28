/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";
import {
  safePushClickUrl,
  safePushNotification,
} from "@/lib/push/notification";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        (url.pathname === "/account" ||
          url.pathname.startsWith("/p/") ||
          url.pathname.startsWith("/api/cloud/") ||
          url.pathname.startsWith("/api/push/") ||
          url.pathname.startsWith("/api/auth/")),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  let payload: unknown = null;
  try {
    payload = event.data?.json();
  } catch {
    /* malformed messages receive only generic local copy */
  }
  const notification = safePushNotification(payload);
  event.waitUntil(
    self.registration.showNotification(
      notification.title,
      notification.options,
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safePushClickUrl(self.location.origin);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(url);
        await existing.focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
