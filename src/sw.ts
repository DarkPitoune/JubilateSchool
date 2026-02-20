/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

// Precache all assets built by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Google Fonts stylesheets
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: "google-fonts-stylesheets",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Google Fonts webfont files
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json() as { title: string; body: string; url?: string };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/app/bookings" },
    })
  );
});

// Click on notification → focus or open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification.data?.url as string) || "/app/bookings";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if possible
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});
