self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const base = new URL(self.registration.scope);
  let target;
  try {
    target = new URL(event.notification.data?.url || "./", base);
  } catch {
    target = base;
  }
  if (
    target.origin !== base.origin ||
    !target.pathname.startsWith(base.pathname)
  )
    target = base;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const client = windows.find((c) => c.url.startsWith(base.href));
      if (client) {
        await client.navigate(target.href);
        return client.focus();
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});
