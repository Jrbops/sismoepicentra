import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './vapid-keys';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

const SUBSCRIPTIONS_FILE = join(process.cwd(), '.data', 'push-subscriptions.json');
const SENT_CACHE_FILE = join(process.cwd(), '.data', 'push-sent-cache.json');

type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userSettings?: {
    minMag?: number;
    cityFilter?: string;
    active?: boolean;
  };
};

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function loadSubscriptions(): PushSubscription[] {
  try {
    if (!existsSync(SUBSCRIPTIONS_FILE)) return [];
    const raw = readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function loadSentCache(): Set<string> {
  try {
    if (!existsSync(SENT_CACHE_FILE)) return new Set();
    const raw = readFileSync(SENT_CACHE_FILE, 'utf-8');
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSentCache(cache: Set<string>) {
  try {
    const dir = join(process.cwd(), '.data');
    const fs = require('fs');
    if (!existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SENT_CACHE_FILE, JSON.stringify([...cache]), 'utf-8');
  } catch (e) {
    console.error('[push-notifier] save sent cache error:', e);
  }
}

export async function sendPushForEarthquake(eq: EarthquakeInterface) {
  const subs = loadSubscriptions();
  const sentCache = loadSentCache();
  const eqKey = `${eq.ID}_${eq.Magnitude}`;
  if (sentCache.has(eqKey)) {
    return; // Already sent
  }
  const matching = subs.filter((sub) => {
    const settings = sub.userSettings || {};
    if (!settings.active) return false;
    const minMag = settings.minMag ?? 3;
    if (eq.Magnitude < minMag) return false;
    if (settings.cityFilter && settings.cityFilter.trim()) {
      const city = settings.cityFilter.trim().toLowerCase();
      const eqCity = (eq.Region?.City || '').toLowerCase();
      if (!eqCity.includes(city)) return false;
    }
    return true;
  });
  if (matching.length === 0) return;
  const payload = JSON.stringify({
    title: `Deprem: M${eq.Magnitude.toFixed(1)}`,
    body: `${eq.Region?.City || 'Bilinmeyen'} - ${eq.Region?.District || ''}\nDerinlik: ${eq.Depth}km`,
    tag: `eq-${eq.ID}`,
    data: { earthquakeId: eq.ID, magnitude: eq.Magnitude },
  });
  const promises = matching.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
    } catch (e: any) {
      console.error('[push-notifier] send error:', e.statusCode, e.body);
    }
  });
  await Promise.allSettled(promises);
  sentCache.add(eqKey);
  saveSentCache(sentCache);
  console.log(`[push-notifier] Sent ${matching.length} notifications for ${eqKey}`);
}
