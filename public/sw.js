// Do not cache authenticated pages or personal API responses.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate")
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width"><title>The Core OS</title><body style="background:#12150f;color:#c7ed87;font-family:system-ui;padding:40px"><h1>Você está offline</h1><p>Conecte-se à internet para acessar seus registros com segurança.</p><a style="color:inherit" href="/">Tentar novamente</a></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((w) => (w.length ? w[0].focus() : self.clients.openWindow("/"))),
  );
});
