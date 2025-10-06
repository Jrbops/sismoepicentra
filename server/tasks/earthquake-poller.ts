// Earthquake polling task: periodically checks for new earthquakes and sends push notifications
// Run this as a background job (e.g., cron or setInterval in Nitro plugin)

import { sendPushForEarthquake } from '../utils/push-notifier';
import { sendFcmForEarthquake } from '../utils/fcm-notifier';
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

let LAST_CHECK_IDS = new Set<string>();

export async function pollAndNotify() {
  try {
    const res = await $fetch<EarthquakeInterface[]>('/api/earthquakes-combined?source=both', { 
      method: 'GET',
      baseURL: process.env.NUXT_PUBLIC_API_BASE || `http://localhost:${process.env.PORT || 8080}`
    });
    if (!Array.isArray(res)) return;
    const now = Date.now();
    const recentThreshold = 30 * 1000; // Son 30 saniye (anlık tespit için)
    const recent = res.filter((eq) => {
      try {
        const eqTime = new Date(eq.Date).getTime();
        return now - eqTime < recentThreshold;
      } catch {
        return false;
      }
    });
    for (const eq of recent) {
      if (!LAST_CHECK_IDS.has(eq.ID)) {
        LAST_CHECK_IDS.add(eq.ID);
        console.log(`[earthquake-poller] New earthquake detected: M${eq.Magnitude} ${eq.Region?.City}`);
        
        // hem Web Push hem FCM gönder
        await Promise.all([
          sendPushForEarthquake(eq).catch(e => console.error('[earthquake-poller] Web push error:', e)),
          sendFcmForEarthquake(eq).catch(e => console.error('[earthquake-poller] FCM error:', e)),
        ]);
      }
    }
    // Cache'i temizle (max 100 ID)
    if (LAST_CHECK_IDS.size > 100) {
      const arr = Array.from(LAST_CHECK_IDS);
      LAST_CHECK_IDS = new Set(arr.slice(-50));
    }
  } catch (error) {
    console.error('[earthquake-poller] Error:', error);
  }
}
