// Test earthquake endpoint - returns recent test earthquakes
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_CACHE_FILE = join(process.cwd(), '.data', 'test-earthquakes.json');

function loadTestEarthquakes(): EarthquakeInterface[] {
  try {
    if (!existsSync(TEST_CACHE_FILE)) return [];
    const raw = readFileSync(TEST_CACHE_FILE, 'utf-8');
    const all = JSON.parse(raw);
    // Son 10 dakika içindekiler
    const now = Date.now();
    const threshold = 10 * 60 * 1000;
    return all.filter((eq: EarthquakeInterface) => {
      const t = new Date(eq.Date).getTime();
      return isFinite(t) && (now - t) <= threshold;
    });
  } catch {
    return [];
  }
}

export default defineEventHandler(() => {
  return loadTestEarthquakes();
});
