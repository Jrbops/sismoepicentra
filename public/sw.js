// Service Worker for Web Push Notifications
// Handles push events and displays notifications

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  let data = { title: 'Deprem Uyarısı', body: 'Yeni bir deprem tespit edildi.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  const options = {
    body: data.body,
    icon: '/android-icon-192x192.png',
    badge: '/favicon-96x96.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'earthquake-alert',
    requireInteraction: true,
    data: data.data || {},
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Eğer zaten açık bir pencere varsa onu odakla ve tam ekran yap
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            // Tam ekran isteği gönder
            focusedClient.postMessage({
              type: 'OPEN_FULLSCREEN_ALERT',
              data: event.notification.data
            });
            return focusedClient;
          });
        }
      }
      // Açık pencere yoksa yeni pencere aç
      if (clients.openWindow) {
        return clients.openWindow('/?alert=fullscreen');
      }
    })
  );
});
