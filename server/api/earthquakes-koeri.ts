import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import type { EarthquakeInterface } from "~~/interfaces/earthquake.interface";

// Primary legacy source (HTML)
const KOERI_URL = "https://www.koeri.boun.edu.tr/scripts/lst6.asp";
// Optional JSON API source (set via runtime config or env). This is intended
// to point at an instance compatible with https://github.com/orhanayd/kandilli-rasathanesi-api
// Example env (nuxt): NUXT_KOERI_API_BASE=https://<your-host>/api
// Expected endpoints (examples): `${base}/last` or `${base}/earthquakes`
// We'll try a few common paths and map fields dynamically.
const API_CANDIDATE_PATHS = [
  "/last", // common "last earthquakes" path
  "/earthquakes",
  "/depremler",
];
let CACHE: Array<EarthquakeInterface> = [];
let LAST_FETCH = 0;
const TTL_MS = 60 * 1000;
let KOERI_FAILS = 0;
let KOERI_DOWN_UNTIL = 0; // epoch ms when breaker closes again

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") return [];
  const q = getQuery(event) as any;
  const config = useRuntimeConfig();
  const apiBase: string | undefined =
    (config as any)?.KOERI_API_BASE || (config.public as any)?.KOERI_API_BASE || process.env.KOERI_API_BASE;
  const now = Date.now();
  // Probe mode: bypass breaker and cache to diagnose live response
  if (q?.probe) {
    try {
      const { list, diag } = await fetchKoeriWithDiag();
      return { probe: true, length: list.length, ...diag };
    } catch (e) {
      return { probe: true, error: String(e) };
    }
  }
  // Circuit breaker: if marked down, serve cache and schedule a probe after window passes
  if (now < KOERI_DOWN_UNTIL) {
    if (q?.debug) {
      return { cache: true, length: CACHE.length, breaker: { downUntil: KOERI_DOWN_UNTIL } };
    }
    return CACHE;
  }
  const isFresh = now - LAST_FETCH < TTL_MS && CACHE.length > 0;
  if (isFresh) {
    setTimeout(() => {
      refreshCache().catch((e) => console.error("[KOERI] refresh error", e));
    }, 0);
    if (q?.debug) {
      return {
        cache: true,
        length: CACHE.length,
      };
    }
    return CACHE;
  }
  try {
    // Prefer JSON API if configured; fallback to scraper
    let list: Array<EarthquakeInterface> = [];
    let diag: any = {};
    if (apiBase) {
      try {
        const { list: apiList, diag: apiDiag } = await fetchKoeriApi(apiBase, q);
        list = apiList; diag = { source: "api", ...apiDiag };
      } catch (apiErr) {
        // fall back to scraper
        const res = await fetchKoeriWithDiag(q?.fast ? { tries: 1, timeoutMs: 6000 } : undefined);
        list = res.list; diag = { source: "scraper", ...res.diag };
      }
    } else {
      const res = await fetchKoeriWithDiag(q?.fast ? { tries: 1, timeoutMs: 6000 } : undefined);
      list = res.list; diag = { source: "scraper", ...res.diag };
    }
    if (list.length) {
      CACHE = list;
      LAST_FETCH = Date.now();
      KOERI_FAILS = 0; // reset on success
    }
    if (q?.debug) return { cache: false, length: list.length, ...diag };
    return CACHE.length ? CACHE : list;
  } catch (e) {
    console.error("KOERI scraping error:", e);
    // Increment failures and possibly open breaker for 5 minutes
    KOERI_FAILS += 1;
    if (KOERI_FAILS >= 2) {
      KOERI_DOWN_UNTIL = Date.now() + 5 * 60 * 1000; // 5 minutes
    }
    if (q?.debug) return { error: String(e) };
    return CACHE;
  }
});

async function refreshCache() {
  const config = useRuntimeConfig();
  const apiBase: string | undefined =
    (config as any)?.KOERI_API_BASE || (config.public as any)?.KOERI_API_BASE || process.env.KOERI_API_BASE;
  let list: Array<EarthquakeInterface> = [];
  if (apiBase) {
    try {
      const res = await fetchKoeriApi(apiBase, {});
      list = res.list;
    } catch {
      const res = await fetchKoeriWithDiag();
      list = res.list;
    }
  } else {
    const res = await fetchKoeriWithDiag();
    list = res.list;
  }
  if (list.length) {
    CACHE = list;
    LAST_FETCH = Date.now();
  }
}

async function fetchKoeriWithDiag(opts?: { tries?: number; timeoutMs?: number }): Promise<{ list: Array<EarthquakeInterface>; diag: any }> {
  let response: any;
  try {
    response = await httpGetWithRetry(KOERI_URL, opts?.tries ?? 5, opts?.timeoutMs ?? 25000);
  } catch (e) {
    // Fallback to HTTP if HTTPS repeatedly times out
    try {
      response = await httpGetWithRetry("http://www.koeri.boun.edu.tr/scripts/lst6.asp", opts?.tries ?? 2, opts?.timeoutMs ?? 25000);
    } catch (e2) {
      throw e2;
    }
  }
  const html = iconv.decode(Buffer.from(response.data), "windows-1254");
  const $ = cheerio.load(html);
  const diag: any = {
    status: (response as any).status,
    hasTable: $("table tbody tr").length > 0,
    tableRows: $("table tbody tr").length,
    preLen: $("pre").text().length,
    htmlSnippet: html.slice(0, 800),
  };
  const headers = Array.from($("table thead th")).map((th) =>
    $(th).text().trim().toLowerCase()
  );
  const findIdx = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));
  const idxDate = findIdx("tarih", "date");
  const idxTime = findIdx("saat", "time");
  const idxLat = findIdx("enlem", "lat");
  const idxLng = findIdx("boylam", "lon");
  const idxDepth = findIdx("derinlik", "depth");
  const idxMD = findIdx("md");
  const idxML = findIdx("ml");
  const idxMw = findIdx("mw");
  const idxLoc = findIdx("yer", "lokasyon", "konum", "bölge");

  const rows = $("table tbody tr");
  const list: Array<EarthquakeInterface> = [];
  rows.each((_, el) => {
    const cols = $(el).find("td");
    if (cols.length < 5) return;
    const pick = (idx: number | undefined | null): string =>
      idx != null && idx >= 0 && idx < cols.length ? $(cols[idx]).text().trim() : "";
    const dateStr = pick(idxDate);
    const timeStr = pick(idxTime);
    const latitudeRaw = pick(idxLat);
    const longitudeRaw = pick(idxLng);
    const depthRaw = pick(idxDepth);
    const mdRaw = pick(idxMD);
    const mlRaw = pick(idxML);
    const mwRaw = pick(idxMw);
    const locationStr = idxLoc != null && idxLoc >= 0 ? pick(idxLoc) : pick(cols.length - 1);
    const extractNumber = (val: string): number => {
      const m = val.replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
      return m ? Number(m[0]) : NaN;
    };
    const Latitude = extractNumber(latitudeRaw);
    const Longitude = extractNumber(longitudeRaw);
    const Depth = extractNumber(depthRaw);
    const md = extractNumber(mdRaw);
    const ml = extractNumber(mlRaw);
    const mw = extractNumber(mwRaw);
    const Magnitude = Number.isFinite(mw)
      ? mw
      : Number.isFinite(ml)
      ? ml
      : md;
    if (!Number.isFinite(Latitude) || !Number.isFinite(Longitude) || !Number.isFinite(Magnitude)) return;
    const DateVal = `${dateStr} ${timeStr}`.trim();
    const { City, District } = parseCityDistrict(locationStr);
    const item: EarthquakeInterface = {
      ID: `${DateVal}_${Latitude}_${Longitude}`,
      Date: DateVal,
      Magnitude,
      Type: "",
      Latitude,
      Longitude,
      Depth: Number.isFinite(Depth) ? Depth : 0,
      Region: { City, District },
      Source: "KOERI",
      ProviderURL: KOERI_URL,
    };
    list.push(item);
  });
  if (list.length > 0) return { list, diag };
  // Fallback: parse <pre> formatted text (common on KOERI site)
  const preText = $("pre").text() || $("body").text();
  if (!preText) return { list, diag };
  const lines = preText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Typical formats: DD.MM.YYYY or YYYY.MM.DD followed by HH:MM:SS
  const hasDate = (l: string) => /\d{2}\.\d{2}\.\d{4}/.test(l) || /\d{4}\.\d{2}\.\d{2}/.test(l);
  const dataLines = lines.filter((l) => hasDate(l) && /\d{2}:\d{2}:\d{2}/.test(l));
  dataLines.forEach((line) => {
    try {
      // Collapse multiple spaces to single
      const parts = line.replace(/\s+/g, " ").split(" ");
      // Expect at least: date time lat lon depth ... location words
      if (parts.length < 7) return;
      const dateStr = parts[0];
      const timeStr = parts[1];
      const latRaw = parts[2];
      const lonRaw = parts[3];
      const depthRaw = parts[4];
      // Magnitudes might be next three fields or fewer; location is rest
      const mdRaw = parts[5] ?? "";
      const mlRaw = parts[6] ?? "";
      const mwRaw = parts[7] ?? "";
      const locStartIdx = parts.findIndex((_, idx) => idx >= 8);
      const locationStr = locStartIdx >= 0 ? parts.slice(locStartIdx).join(" ") : parts.slice(8).join(" ");
      const toNum = (v: string) => {
        const m = v.replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : NaN;
      };
      const Latitude = toNum(latRaw);
      const Longitude = toNum(lonRaw);
      const Depth = toNum(depthRaw);
      const md = toNum(mdRaw);
      const ml = toNum(mlRaw);
      const mw = toNum(mwRaw);
      const Magnitude = Number.isFinite(mw) ? mw : Number.isFinite(ml) ? ml : md;
      if (!Number.isFinite(Latitude) || !Number.isFinite(Longitude) || !Number.isFinite(Magnitude)) return;
      const DateVal = `${dateStr} ${timeStr}`.trim();
      const { City, District } = parseCityDistrict(locationStr);
      list.push({
        ID: `${DateVal}_${Latitude}_${Longitude}`,
        Date: DateVal,
        Magnitude,
        Type: "",
        Latitude,
        Longitude,
        Depth: Number.isFinite(Depth) ? Depth : 0,
        Region: { City, District },
        Source: "KOERI",
        ProviderURL: KOERI_URL,
      });
    } catch (e) {
      // ignore line errors
    }
  });
  return { list, diag };
}

// JSON API (opsiyonel) entegrasyonu: orhanayd/kandilli-rasathanesi-api ile uyumlu
async function fetchKoeriApi(apiBase: string, q: Record<string, any>): Promise<{ list: Array<EarthquakeInterface>; diag: any }>{
  const base = apiBase.replace(/\/$/, "");
  const candidates = API_CANDIDATE_PATHS;
  let lastErr: any = null;
  for (const path of candidates) {
    try {
      const url = `${base}${path}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { method: "GET", signal: controller.signal as any, headers: { Accept: "application/json" } });
      clearTimeout(t);
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const data: any = await res.json();
      const arr: any[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.result)
        ? (data as any).result
        : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];
      const list: Array<EarthquakeInterface> = arr
        .map((it) => mapKoeriJsonToEq(it))
        .filter(Boolean) as Array<EarthquakeInterface>;
      list.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
      if (list.length) return { list, diag: { url, count: list.length } };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("KOERI API returned no data");
}

function mapKoeriJsonToEq(it: any): EarthquakeInterface | null {
  if (!it) return null;
  const date = it.date || it.Date || it.datetime || it.time || "";
  const mag = Number(it.mw ?? it.ml ?? it.md ?? it.mag ?? it.Magnitude);
  const lat = Number(it.latitude ?? it.lat ?? it.Latitude);
  const lon = Number(it.longitude ?? it.lng ?? it.lon ?? it.Longitude);
  const depth = Number(it.depth ?? it.Depth ?? it.depth_km ?? it.km);
  const loc = String((it.location ?? it.title ?? it.place ?? it.Location ?? it.region) || "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) return null;
  const { City, District } = parseCityDistrict(loc);
  const DateVal = String(date).trim();
  return {
    ID: `${DateVal}_${lat}_${lon}`,
    Date: DateVal,
    Magnitude: mag,
    Type: "",
    Latitude: lat,
    Longitude: lon,
    Depth: Number.isFinite(depth) ? depth : 0,
    Region: { City, District },
    Source: "KOERI",
    ProviderURL: "koeri-json-api",
  } as EarthquakeInterface;
}

async function httpGetWithRetry(url: string, tries = 3, timeoutMs = 12000) {
  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          Referer: "https://www.koeri.boun.edu.tr/",
          "Accept-Charset": "ISO-8859-9,utf-8;q=0.7,*;q=0.7",
          "Accept-Encoding": "identity",
        },
        timeout: timeoutMs,
      });
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

function parseCityDistrict(location: string): { City: string; District: string } {
  if (!location) return { City: "", District: "" };
  const withParen = location.match(/^(.*)\((.*)\)$/);
  if (withParen) {
    const left = withParen[1].trim();
    const inside = withParen[2].trim();
    if (inside.length >= left.length) return { City: inside, District: left };
    return { City: left, District: inside };
  }
  const parts = location.split(/\s+/);
  if (parts.length > 1) return { City: parts[parts.length - 1], District: parts.slice(0, -1).join(" ") };
  return { City: location, District: "" };
}
