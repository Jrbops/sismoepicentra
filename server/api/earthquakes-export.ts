import type { EarthquakeInterface } from "~~/interfaces/earthquake.interface";

function toCSV(rows: Array<Record<string, any>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as any;
  const format = (q.format as string)?.toLowerCase() === "csv" ? "csv" : "json";
  const source = (q.source as string) || "afad"; // afad|koeri|both
  const city = (q.city as string) || "";
  const magnitude = q.magnitude != null ? Number(q.magnitude) : undefined;

  const endpoint = source === "afad"
    ? "/api/earthquakes"
    : source === "koeri"
    ? "/api/earthquakes-koeri"
    : "/api/earthquakes-combined?source=both";

  const list = await $fetch<Array<EarthquakeInterface>>(endpoint, { method: "GET" }).catch(() => []);
  let out = Array.isArray(list) ? list.slice() : [];

  if (city) {
    const norm = (s: string) => s?.toLocaleLowerCase("tr").normalize("NFKD").replace(/[^a-z0-9]/gi, "");
    const cNorm = norm(city);
    out = out.filter((it) => norm(it.Region?.City || "") === cNorm);
  }
  if (typeof magnitude === "number" && Number.isFinite(magnitude)) {
    out = out.filter((it) => Number(it.Magnitude) > magnitude);
  }

  if (format === "json") {
    setHeader(event, "Content-Type", "application/json; charset=utf-8");
    setHeader(event, "Content-Disposition", `attachment; filename=earthquakes_${source}.json`);
    return out;
  }

  const rows = out.map((e) => ({
    id: e.ID,
    date: e.Date,
    magnitude: e.Magnitude,
    type: e.Type,
    latitude: e.Latitude,
    longitude: e.Longitude,
    depth_km: e.Depth,
    city: e.Region?.City || "",
    district: e.Region?.District || "",
    source: e.Source || "",
    provider_url: e.ProviderURL || "",
  }));
  const csv = toCSV(rows);
  setHeader(event, "Content-Type", "text/csv; charset=utf-8");
  setHeader(event, "Content-Disposition", `attachment; filename=earthquakes_${source}.csv`);
  return csv;
});
