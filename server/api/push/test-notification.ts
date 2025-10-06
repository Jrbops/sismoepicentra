// Test endpoint to manually trigger a push notification
// Usage: POST /api/push/test-notification with body: { magnitude, city, district, depth }

import { sendFcmForEarthquake } from '../../utils/fcm-notifier';
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'POST') {
    return { error: 'Method not allowed' };
  }
  const body = await readBody(event);
  const { magnitude = 4.5, city = 'Test Şehir', district = 'Test İlçe', depth = 10 } = body;
  
  const testEarthquake: EarthquakeInterface = {
    ID: `test-${Date.now()}`,
    Date: new Date().toISOString(),
    Magnitude: Number(magnitude),
    Type: 'ML',
    Latitude: 41.0082,
    Longitude: 28.9784,
    Depth: Number(depth),
    Region: { City: String(city), District: String(district) },
    Source: 'KOERI',
    ProviderURL: 'test',
  };

  await sendFcmForEarthquake(testEarthquake);
  
  // Save to test cache for display on main page
  try {
    const { readFileSync, writeFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const testCacheFile = join(process.cwd(), '.data', 'test-earthquakes.json');
    let cache: any[] = [];
    if (existsSync(testCacheFile)) {
      const raw = readFileSync(testCacheFile, 'utf-8');
      cache = JSON.parse(raw);
    }
    cache.push(testEarthquake);
    // Keep only last 20
    if (cache.length > 20) cache = cache.slice(-20);
    const dir = join(process.cwd(), '.data');
    if (!existsSync(dir)) {
      const fs = await import('fs');
      fs.mkdirSync(dir, { recursive: true });
    }
    writeFileSync(testCacheFile, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (e) {
    console.error('[test-notification] cache save error:', e);
  }
  
  return { success: true, earthquake: testEarthquake, message: 'Test push notification sent' };
});
