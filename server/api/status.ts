import type { H3Event } from 'h3'

type ProviderStatus = { up: boolean; latency: number; length?: number };
type StatusResponse = {
  now: string;
  totalLatency: number;
  providers: { afad: ProviderStatus; koeri: ProviderStatus };
};

export default defineEventHandler(async (event: H3Event): Promise<StatusResponse> => {
  const t0 = Date.now();
  const ping = async (path: string, ms = 4000): Promise<ProviderStatus> => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), ms);
      const res = await $fetch<unknown>(path, { method: 'GET', signal: controller.signal as any });
      clearTimeout(to);
      const latency = Date.now() - start;
      const length = Array.isArray(res) ? res.length : (typeof (res as any)?.length === 'number' ? (res as any).length : undefined);
      return { up: true, latency, length };
    } catch (e) {
      return { up: false, latency: Date.now() - start };
    }
  };
  const [afad, koeri] = await Promise.all<ProviderStatus>([
    ping('/api/earthquakes', 4000),
    ping('/api/earthquakes-koeri', 6000),
  ]);
  return {
    now: new Date().toISOString(),
    totalLatency: Date.now() - t0,
    providers: {
      afad,
      koeri,
    },
  };
})
