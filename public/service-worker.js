// ============================================================
// Service Worker - SII AQUA Médica
// Maneja caché del shell estático y notificaciones push
// ============================================================

const APP_SHELL_CACHE = "sii-aqua-shell-v4";
const APP_SHELL_ASSETS = [
    "/",
    "/index.html",
    "/logo.png",
    "/logosmall.svg",
    "/favicon.ico",
    "/src/index.css",
    "/src/App.css",
    "/src/styles/auth/login-premium.css",
    "/src/styles/operator/operator-shell.css",
    "/src/styles/operator/operator-home.css",
    "/src/styles/operator/operator-theme.css",
    "/bootstrap.min.css",
    "/assets/"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => {
            return cache.addAll(APP_SHELL_ASSETS).catch(() => undefined);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key.startsWith("sii-aqua-") && key !== APP_SHELL_CACHE)
                    .map((key) => caches.delete(key))
            );
        }).then(() => clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isStaticAsset = /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|json|woff2?|ttf|map)$/i.test(url.pathname) || url.pathname.endsWith("/index.html") || url.pathname.includes("/src/") || url.pathname.includes("/styles/") || url.pathname.includes("/assets/");
    const isAppShell = isSameOrigin && (url.pathname === "/" || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/src/") || url.pathname.startsWith("/styles/") || isStaticAsset);

    if (!isAppShell) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => {
                    if (request.mode === "navigate") {
                        return caches.match("/index.html");
                    }

                    return caches.match(request) || caches.match("/");
                });
        })
    );
});

// Escuchar eventos push del navegador (fallback)
self.addEventListener("push", (event) => {
    if (!event.data) {
        return;
    }

    try {
        const data = event.data.json();

        const options = {
            body: data.notification?.body || data.body || "Tienes un nuevo aviso",
            icon: "/logo.png",
            badge: "/logosmall.svg",
            tag: data.notification?.tag || "notification",
            requireInteraction: true,
            vibrate: [300, 100, 400, 100, 400],
            silent: false,
            data: {
                destino: data.data?.destino || null,
                accion: data.data?.accion || null,
                url: "/"
            }
        };

        const title = data.notification?.title || data.title || "SII AQUA Médica";

        event.waitUntil(
            self.registration.showNotification(title, options)
        );

    } catch (error) {
        console.error("Error procesando push notification:", error);
    }
});

// Escuchar mensajes de la página (Firebase FCM)
self.addEventListener("message", (event) => {
    if (event.data?.type === "SHOW_NOTIFICATION") {
        const payload = event.data.payload;

        const options = {
            body: payload.notification?.body || "Tienes un nuevo aviso",
            icon: "/logo.png",
            badge: "/logosmall.svg",
            tag: payload.data?.tag || "notification",
            requireInteraction: true,
            vibrate: [300, 100, 400, 100, 400],
            silent: false,
            data: {
                destino: payload.data?.destino || null,
                accion: payload.data?.accion || null,
                url: "/"
            }
        };

        const title = payload.notification?.title || "SII AQUA Médica";

        self.registration.showNotification(title, options);
    }
});

// Escuchar cuando el usuario interactúa con la notificación
self.addEventListener("notificationclick", (event) => {

    event.notification.close();

    const destino = event.notification.data?.destino || "/";
    const urlAbrir = destino.startsWith("/") ? destino : "/" + destino;

    event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
            for (let client of clientList) {
                if (client.url === urlAbrir && "focus" in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(urlAbrir);
            }
        })
    );
});

self.addEventListener("notificationclose", (event) => {
});
