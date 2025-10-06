import axios from "axios";
import * as cheerio from "cheerio";
import type { EarthquakeInterface } from "~~/interfaces/earthquake.interface";

const AFAD_URL = "https://deprem.afad.gov.tr/last-earthquakes.html";
let CACHE: Array<EarthquakeInterface> = [];
let LAST_FETCH = 0;
const TTL_MS = 60 * 1000; // 60 seconds

const parseCityDistrict = (location: string): { City: string; District: string } => {
  if (!location) return { City: "", District: "" };
  // AFAD konum metinleri genelde "IL (ILCE)" veya "ILCE (IL)" ya da sadece "IL" formatında olabilir
  const withParen = location.match(/^(.*)\((.*)\)$/);
  if (withParen) {
    const left = withParen[1].trim();
    const inside = withParen[2].trim();
    // Hangisi şehir hangisi ilçe belirlemek için uzunluğa ve büyük harfe bakıyoruz
    // Türkçe özel karakterleri koruyoruz, normalize etmiyoruz
    if (inside.length >= left.length) {
      return { City: inside, District: left };
    } else {
      return { City: left, District: inside };
    }
  }
  // Parantez yoksa, son kelimeyi şehir varsay, geri kalanı ilçe gibi ele al
  const parts = location.split(/\s+/);
  if (parts.length > 1) {
    const City = parts[parts.length - 1];
    const District = parts.slice(0, -1).join(" ");
    return { City, District };
  }
  return { City: location, District: "" };
};

async function httpGetWithRetry(url: string, tries = 3, timeoutMs = 12000) {
  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await axios.get<string>(url, {
        responseType: "text",
        timeout: timeoutMs,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

export default defineEventHandler(async (event) => {
  // Cache kontrolü - Her zaman fresh data
  setResponseHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate');
  setResponseHeader(event, 'Pragma', 'no-cache');
  setResponseHeader(event, 'Expires', '0');
  
  if (event.node.req.method !== "GET") return [];
  const now = Date.now();
  const isFresh = now - LAST_FETCH < TTL_MS && CACHE.length > 0;
  // Serve fresh cache immediately if valid
  if (isFresh) {
    // Revalidate in background
    setTimeout(() => {
      refreshCache().catch((e) => console.error("[AFAD] background refresh error", e));
    }, 0);
    return CACHE;
  }
  try {
    const response = await httpGetWithRetry(AFAD_URL, 3, 12000);
    const $ = cheerio.load(response.data);
    // Tablo başlıklarından kolon indekslerini çıkar
    const headers = Array.from($("table thead th")).map((th) =>
      $(th).text().trim().toLowerCase()
    );
    const findIdx = (...candidates: string[]) =>
      headers.findIndex((h) => candidates.some((c) => h.includes(c)));
    const idxDate = findIdx("tarih");
    const idxLat = findIdx("enlem", "latitude");
    const idxLng = findIdx("boylam", "longitude");
    const idxDepth = findIdx("derinlik", "depth");
    const idxMD = findIdx("md");
    const idxML = findIdx("ml");
    const idxMw = findIdx("mw");
    const idxMag = findIdx("büyüklük", "buyukluk", "magnitude");
    const idxType = findIdx("tip", "type");
    const idxLoc = findIdx("yer", "konum", "lokasyon", "yerel", "bölge", "il", "ilçe");

    const rows = $("table tbody tr");
    console.log("[AFAD] rows found:", rows.length, "headers:", headers);
    const list: Array<EarthquakeInterface> = [];
    rows.each((_, el) => {
      const cols = $(el).find("td");
      if (cols.length < 5) return; // minimum güvenlik
      const pick = (idx: number | undefined | null): string =>
        idx != null && idx >= 0 && idx < cols.length ? $(cols[idx]).text().trim() : "";
      const dateStr = pick(idxDate);
      const latitudeRaw = pick(idxLat);
      const longitudeRaw = pick(idxLng);
      const depthRaw = pick(idxDepth);
      const mdRaw = pick(idxMD);
      const mlRaw = pick(idxML);
      const mwRaw = pick(idxMw);
      const magRaw = pick(idxMag);
      const typeStr = pick(idxType);
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
      const mag = extractNumber(magRaw);
      const Magnitude = Number.isFinite(mag)
        ? mag
        : Number.isFinite(mw)
        ? mw
        : Number.isFinite(ml)
        ? ml
        : md;
      if (!Number.isFinite(Latitude) || !Number.isFinite(Longitude) || !Number.isFinite(Magnitude)) {
        return; // skip invalid rows
      }
      const depthVal = Number.isFinite(Depth) ? Depth : 0;
      const DateVal = dateStr; // ham string; frontend dayjs ile işliyor
      const { City, District } = parseCityDistrict(locationStr);

      const item: EarthquakeInterface = {
        ID: `${DateVal}_${Latitude}_${Longitude}`,
        Date: DateVal,
        Magnitude,
        Type: typeStr,
        Latitude,
        Longitude,
        Depth: depthVal,
        Region: { City, District },
        Source: "AFAD",
        ProviderURL: AFAD_URL,
      };
      list.push(item);
    });
    console.log("[AFAD] parsed list length:", list.length);
    if (list.length > 0) {
      CACHE = list;
      LAST_FETCH = Date.now();
    }
    return CACHE.length ? CACHE : list;
  } catch (error) {
    console.error("AFAD scraping error:", error);
    // On error, serve cache if exists
    return CACHE;
  }
});

async function refreshCache() {
  const response = await httpGetWithRetry(AFAD_URL, 3, 12000);
  const $ = cheerio.load(response.data);
  const headers = Array.from($("table thead th")).map((th) =>
    $(th).text().trim().toLowerCase()
  );
  const findIdx = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));
  const idxDate = findIdx("tarih");
  const idxLat = findIdx("enlem", "latitude");
  const idxLng = findIdx("boylam", "longitude");
  const idxDepth = findIdx("derinlik", "depth");
  const idxMD = findIdx("md");
  const idxML = findIdx("ml");
  const idxMw = findIdx("mw");
  const idxMag = findIdx("büyüklük", "buyukluk", "magnitude");
  const idxType = findIdx("tip", "type");
  const idxLoc = findIdx("yer", "konum", "lokasyon", "yerel", "bölge", "il", "ilçe");

  const rows = $("table tbody tr");
  const list: Array<EarthquakeInterface> = [];
  rows.each((_, el) => {
    const cols = $(el).find("td");
    if (cols.length < 5) return;
    const pick = (idx: number | undefined | null): string =>
      idx != null && idx >= 0 && idx < cols.length ? $(cols[idx]).text().trim() : "";
    const dateStr = pick(idxDate);
    const latitudeRaw = pick(idxLat);
    const longitudeRaw = pick(idxLng);
    const depthRaw = pick(idxDepth);
    const mdRaw = pick(idxMD);
    const mlRaw = pick(idxML);
    const mwRaw = pick(idxMw);
    const magRaw = pick(idxMag);
    const typeStr = pick(idxType);
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
    const mag = extractNumber(magRaw);
    const Magnitude = Number.isFinite(mag)
      ? mag
      : Number.isFinite(mw)
      ? mw
      : Number.isFinite(ml)
      ? ml
      : md;
    if (!Number.isFinite(Latitude) || !Number.isFinite(Longitude) || !Number.isFinite(Magnitude)) {
      return;
    }
    const depthVal = Number.isFinite(Depth) ? Depth : 0;
    const DateVal = dateStr;
    const { City, District } = parseCityDistrict(locationStr);

    const item: EarthquakeInterface = {
      ID: `${DateVal}_${Latitude}_${Longitude}`,
      Date: DateVal,
      Magnitude,
      Type: typeStr,
      Latitude,
      Longitude,
      Depth: depthVal,
      Region: { City, District },
    };
    list.push(item);
  });
  if (list.length > 0) {
    CACHE = list;
    LAST_FETCH = Date.now();
  }
}
