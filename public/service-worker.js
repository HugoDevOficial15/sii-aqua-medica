// ============================================================
// Service Worker - SII AQUA Médica
// Maneja notificaciones push incluso cuando la app está cerrada
// ============================================================

// Escuchar eventos push del navegador (fallback)
self.addEventListener("push", (event) => {
    console.log("Push event recibido:", event);

    if (!event.data) {
        console.log("Push recibido sin datos");
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

        console.log("✓ Notificación push mostrada:", title);

    } catch (error) {
        console.error("Error procesando push notification:", error);
    }
});

// Escuchar mensajes de la página (Firebase FCM)
self.addEventListener("message", (event) => {
    console.log("Message event recibido en SW:", event.data);

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
        console.log("✓ Notificación FCM mostrada:", title);
    }
});

// Escuchar cuando el usuario interactúa con la notificación
self.addEventListener("notificationclick", (event) => {
    console.log("Notificación clickeada:", event.notification.tag);

    event.notification.close();

    const destino = event.notification.data?.destino || "/";
    const urlAbrir = destino.startsWith("/") ? destino : "/" + destino;

    event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
            // Si ya hay una ventana abierta, enfocarla y navegar
            for (let client of clientList) {
                if (client.url === urlAbrir && "focus" in client) {
                    return client.focus();
                }
            }

            // Si no hay ventana, abrir una nueva
            if (clients.openWindow) {
                return clients.openWindow(urlAbrir);
            }
        })
    );
});

// Escuchar cierres de notificaciones
self.addEventListener("notificationclose", (event) => {
    console.log("Notificación cerrada:", event.notification.tag);
});

// Actualización del service worker
self.addEventListener("install", (event) => {
    console.log("Service Worker instalado");
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker activado");
    event.waitUntil(clients.claim());
});
