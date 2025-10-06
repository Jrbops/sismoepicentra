import type { EarthquakeInterface } from "~~/interfaces/earthquake.interface";

export default defineEventHandler(async (event) => {
  // Cache kontrolü - Her zaman fresh data
  setResponseHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate');
  setResponseHeader(event, 'Pragma', 'no-cache');
  setResponseHeader(event, 'Expires', '0');
  
  if (event.node.req.method !== "GET") return [];
  const query = getQuery(event);
  const source = (query.source as string) || "afad"; // afad | koeri | usgs | all
  const config = useRuntimeConfig();
  const tolSec = Number((config as any)?.COMBINED_TOL_SECONDS ?? process.env.COMBINED_TOL_SECONDS ?? 10);
  const tolKm = Number((config as any)?.COMBINED_TOL_KM ?? process.env.COMBINED_TOL_KM ?? 3);
  const toKey = (e: EarthquakeInterface) => `${new Date(e.Date).getTime()}_${e.Latitude}_${e.Longitude}`;
  const haversineKm = (a:{lat:number,lng:number}, b:{lat:number,lng:number}) => {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI/180;
    const dLng = (b.lng - a.lng) * Math.PI/180;
    const la1 = a.lat * Math.PI/180;
    const la2 = b.lat * Math.PI/180;
    const x = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  const dedupeTolerant = (arr: EarthquakeInterface[]): EarthquakeInterface[] => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const sorted = [...arr].sort((a,b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    const out: EarthquakeInterface[] = [];
    for (const it of sorted) {
      const t = new Date(it.Date).getTime();
      let dup = false;
      for (const kept of out) {
        const tk = new Date(kept.Date).getTime();
        if (Math.abs(t - tk) <= tolSec * 1000) {
          const d = haversineKm({lat: it.Latitude, lng: it.Longitude}, {lat: kept.Latitude, lng: kept.Longitude});
          if (d <= tolKm) { dup = true; break; }
        }
      }
      if (!dup) out.push(it);
    }
    return out;
  };
  const collect = async (path: string, ms = 6000) => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), ms);
      const data = await $fetch(path);
      clearTimeout(t);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };
  if (source === "all") {
    const [afadRes, koeriRes, usgsRes] = await Promise.allSettled([
      collect("/api/earthquakes", 6000),
      collect("/api/earthquakes-koeri?fast=1", 6500),
      collect("/api/earthquakes-usgs", 8000),
    ]);
    const afad = afadRes.status === 'fulfilled' ? afadRes.value : [];
    const koeri = koeriRes.status === 'fulfilled' ? koeriRes.value : [];
    const usgs = usgsRes.status === 'fulfilled' ? usgsRes.value : [];
    // Birleştir, toleranslı tekilleştir ve tarihe göre sırala
    const mergedRaw = [...(afad||[]), ...(koeri||[]), ...(usgs||[])];
    const merged = dedupeTolerant(mergedRaw);
    merged.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    return merged;
  }
  if (source === "usgs") return await collect("/api/earthquakes-usgs");
  if (source === "both") {
    const [afadRes, koeriRes] = await Promise.allSettled([
      collect("/api/earthquakes", 6000),
      collect("/api/earthquakes-koeri?fast=1", 6500),
    ]);
    const afad = afadRes.status === 'fulfilled' ? afadRes.value : [];
    const koeri = koeriRes.status === 'fulfilled' ? koeriRes.value : [];
    // Birleştir, toleranslı tekilleştir ve tarihe göre sırala
    const mergedRaw = [...(afad||[]), ...(koeri||[])];
    const merged = dedupeTolerant(mergedRaw);
    merged.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    return merged;
  }
  if (source === "koeri") return await collect("/api/earthquakes-koeri");
  return await collect("/api/earthquakes");
});
