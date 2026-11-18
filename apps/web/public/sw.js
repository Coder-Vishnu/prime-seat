// apps/web/public/sw.js
// PWA Service Worker & Native Desktop Push Handler

self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Prime Seat Reclamation Alert!';
  const options = {
    body: `Row ${data.row} Seat ${data.number} just vacated! Click to reserve immediately.`,
    icon: '/icons/seat-icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200, 100, 400],
    tag: `seat-drop-${data.row}-${data.number}`,
    renotify: true,
    data: {
      url: data.checkout_url || 'https://www.amctheatres.com',
    },
    actions: [
      { action: 'claim', title: 'Claim Seat' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.action === 'claim' || !event.action) {
    const targetUrl = event.notification.data.url;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});
