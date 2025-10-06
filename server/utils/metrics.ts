// Simple in-memory Prometheus-like metrics for Nitro
// Not production-grade, but good enough for basic observability.

export type Labels = Record<string, string>;

class Counter {
  name: string;
  help: string;
  values: Map<string, number> = new Map();
  constructor(name: string, help: string) { this.name = name; this.help = help; }
  inc(labels: Labels = {}, val = 1) {
    const key = JSON.stringify(labels);
    this.values.set(key, (this.values.get(key) || 0) + val);
  }
  toProm(): string {
    const lines: string[] = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} counter`,
    ];
    for (const [k, v] of this.values.entries()) {
      const lbl = JSON.parse(k) as Labels;
      const parts = Object.entries(lbl).map(([lk, lv]) => `${lk}="${lv}"`).join(',');
      lines.push(`${this.name}{${parts}} ${v}`);
    }
    return lines.join('\n');
  }
}

class Histogram {
  name: string;
  help: string;
  buckets: number[];
  values: Map<string, number[]> = new Map();
  constructor(name: string, help: string, buckets: number[]) {
    this.name = name; this.help = help; this.buckets = [...buckets].sort((a,b)=>a-b);
  }
  observe(labels: Labels = {}, val: number) {
    const key = JSON.stringify(labels);
    const arr = this.values.get(key) || new Array(this.buckets.length + 1).fill(0);
    // increment le buckets
    for (let i=0;i<this.buckets.length;i++) if (val <= this.buckets[i]) arr[i]++;
    // +Inf bucket
    arr[this.buckets.length]++;
    this.values.set(key, arr);
  }
  toProm(): string {
    const lines: string[] = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} histogram`,
    ];
    for (const [k, arr] of this.values.entries()) {
      const lbl = JSON.parse(k) as Labels;
      for (let i=0;i<this.buckets.length;i++) {
        const parts = Object.entries({ ...lbl, le: String(this.buckets[i]) }).map(([lk, lv]) => `${lk}="${lv}` + '"').join(',');
        lines.push(`${this.name}_bucket{${parts}} ${arr[i]}`);
      }
      const partsInf = Object.entries({ ...lbl, le: '+Inf' }).map(([lk, lv]) => `${lk}="${lv}` + '"').join(',');
      lines.push(`${this.name}_bucket{${partsInf}} ${arr[this.buckets.length]}`);
      // sum not tracked precisely; skip sum/count for simplicity
    }
    return lines.join('\n');
  }
}

// Global metrics
export const httpRequestsTotal = new Counter('http_requests_total', 'Total HTTP requests');
export const httpRequestErrorsTotal = new Counter('http_request_errors_total', 'Total HTTP error responses');
export const httpRequestDurationMs = new Histogram('http_request_duration_ms', 'HTTP request duration in ms', [50, 100, 250, 500, 1000, 2000, 5000]);

export function renderPrometheus(): string {
  return [
    httpRequestsTotal.toProm(),
    httpRequestErrorsTotal.toProm(),
    httpRequestDurationMs.toProm(),
    ''
  ].join('\n');
}
