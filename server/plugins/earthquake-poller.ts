// Nitro plugin to start earthquake polling on server startup
import { pollAndNotify } from '../tasks/earthquake-poller';

export default defineNitroPlugin((nitroApp) => {
  // Skip polling during build/prerender
  if (process.env.NITRO_PRESET === 'static' || process.env.prerender) {
    console.log('[earthquake-poller] Skipping background polling during build/prerender');
    return;
  }

  // Her 10 saniyede bir yeni depremleri kontrol et (anlık bildirim için)
  const POLL_INTERVAL = 10 * 1000; // 10 saniye

  console.log('[earthquake-poller] Starting FAST background polling (10 second interval)...');

  setInterval(async () => {
    try {
      await pollAndNotify();
    } catch (e) {
      console.error('[earthquake-poller] Interval error:', e);
    }
  }, POLL_INTERVAL);

  // İlk çalıştırmayı 5 saniye sonra yap
  setTimeout(() => {
    pollAndNotify().catch(e => console.error('[earthquake-poller] Initial run error:', e));
  }, 5000);
});
