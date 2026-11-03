// Service worker de Cuelga: solo muestra notificaciones. No guarda nada en caché ni intercepta peticiones.
// El texto llega del servidor, que lo saca del catálogo cerrado (textoPregunta en src/lib/llamada.ts).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const n = event.data ? event.data.json() : {};
  const opciones = {
    body: n.detalle,
    tag: n.etiqueta || "cuelga",
    renotify: true,
    requireInteraction: true,
    icon: "/icono-192.png",
    vibrate: [400, 150, 400, 150, 400],
    data: n,
  };
  // En Android el familiar contesta «Sí» sin abrir nada; en iPhone tocar la notificación abre su página.
  if (n.si && n.api && n.llamadaId) opciones.actions = [{ action: "si", title: n.si }];
  event.waitUntil(self.registration.showNotification(n.titulo || "Cuelga", opciones));
});

async function abrir(url) {
  const destino = new URL(url || "/", self.location.origin);
  const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const v of ventanas) {
    if (new URL(v.url).pathname === destino.pathname && "focus" in v) return v.focus();
  }
  return self.clients.openWindow(destino.href);
}

async function contestarSi(n, tag) {
  const r = await fetch(n.api, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ llamadaId: n.llamadaId, estaBien: true }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  await self.registration.showNotification("Cuelga", { body: n.listo, tag, icon: "/icono-192.png", data: { url: n.url } });
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification.data || {};
  const tag = event.notification.tag;
  event.notification.close();
  if (event.action === "si") {
    // Si la respuesta no llega, se abre la página para contestar ahí.
    event.waitUntil(contestarSi(n, tag).catch(() => abrir(n.url)));
    return;
  }
  event.waitUntil(abrir(n.url));
});
