import { httpRequestsTotal, httpRequestErrorsTotal, httpRequestDurationMs } from "../utils/metrics";

function genId(len = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

export default defineEventHandler((event) => {
  const start = Date.now();
  const { req, res } = event.node;
  const method = req.method || "GET";
  const url = req.url || event.path || "";
  const correlationId = genId();
  // Basit provider etiketi: path içinde koeri/earthquakes-combined/earthquakes
  const provider = url.includes('earthquakes-koeri') ? 'koeri' : url.includes('earthquakes') ? 'afad' : 'unknown';

  // İstek sayacı
  httpRequestsTotal.inc({ method, provider });

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    // Hata sayacı
    if (status >= 400) httpRequestErrorsTotal.inc({ method, provider, status: String(status) });
    // Süre histogramı
    httpRequestDurationMs.observe({ method, provider }, ms);
    // Erişim satırı (correlation-id ile)
    console.log(`[HTTP] id=${correlationId} ${method} ${url} -> ${status} ${ms}ms provider=${provider}`);
  });
});
