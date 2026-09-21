/* 4DS emergency notification service worker — foundation for web push + lock-screen alerts. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deepLink =
    (event.notification.data && event.notification.data.deepLink) || '/portal';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate?.(deepLink);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(deepLink);
      return undefined;
    }),
  );
});

self.addEventListener('push', (event) => {
  let data = {
    title: '4DS SECURITY ALERT',
    body: 'Emergency update',
    deepLink: '/portal',
    urgency: 'high',
    vibrate: true,
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* keep defaults */
  }
  const critical = data.urgency === 'critical';
  const vibrate = data.vibrate === false ? undefined : critical ? [200, 100, 200, 100, 200, 400, 200, 100, 200] : [100, 50, 100];
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.incidentId ? `incident-${data.incidentId}` : '4ds-push',
      requireInteraction: critical,
      vibrate,
      data: { deepLink: data.deepLink || '/portal', urgency: data.urgency },
    }),
  );
});
