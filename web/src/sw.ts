import { CacheFirst, StaleWhileRevalidate } from "serwist";
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, ExpirationPlugin } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
  runtimeCaching: [
    // Patient API — stale-while-revalidate, 5-min TTL
    {
      matcher: /\/api\/v1\/patients/,
      handler: new StaleWhileRevalidate({
        cacheName: "api-patients",
        plugins: [new ExpirationPlugin({ maxAgeSeconds: 300 })],
      }),
    },
    // JS/CSS chunks — cache-first, 7-day TTL
    {
      matcher: /\/_next\/static\//,
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 7 })],
      }),
    },
    // Fonts — cache-first, 30-day TTL
    {
      matcher: /\/fonts\//,
      handler: new CacheFirst({
        cacheName: "fonts",
        plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    // Protocol JSON — cache-first (versioned with app)
    {
      matcher: /\/protocols\/.*\.json/,
      handler: new CacheFirst({
        cacheName: "protocols-json",
        plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
