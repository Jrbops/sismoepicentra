import type { H3Event } from 'h3';
import { sendStream } from 'h3';
import { $fetch } from 'ofetch';
import type { EarthquakeInterface } from '~~/interfaces/earthquake.interface';

export default defineEventHandler(async (event: H3Event) => {
  // Temporarily disabled for APK build
  // setResponseHeaders(event, {
  //   'Content-Type': 'text/event-stream',
  //   'Cache-Control': 'no-cache',
  //   'Connection': 'keep-alive',
  //   'Access-Control-Allow-Origin': '*',
  // });
  // let lastId = '';
  // let stopped = false;
  // event.node.res.on('close', () => { stopped = true; });

  // while (!stopped) {
  //   try {
  //     const data: EarthquakeInterface[] = await $fetch('/api/earthquakes-combined', { method: 'GET' });
  //     if (data && data.length) {
  //       const latest = data[0];
  //       if (latest.ID !== lastId) {
  //         lastId = latest.ID;
  //         const payload = JSON.stringify(latest);
  //         event.node.res.write(`data: ${payload}\n\n`);
  //       }
  //     }
  //   } catch (e) {
  //     // Hata olursa bekle ve devam et
  //   }
  //   await new Promise(r => setTimeout(r, 2000));
  // }
  // event.node.res.end();

  // Return empty response for build
  return { message: 'SSE endpoint disabled for build' };
});
