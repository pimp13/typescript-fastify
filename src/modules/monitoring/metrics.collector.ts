type TimedRequest = {
  at: number;
  durationMs: number;
  statusCode: number;
  method: string;
  route: string;
};

const WINDOW_MS = 60_000;
const MAX_EVENTS = 2_000;

const startedAt = Date.now();
const events: TimedRequest[] = [];

let previousCpu = process.cpuUsage();
let previousCpuAt = Date.now();

function prune(now = Date.now()) {
  const cutoff = now - WINDOW_MS;
  while (events.length > 0 && events[0]!.at < cutoff) {
    events.shift();
  }

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

export function recordRequest(input: {
  durationMs: number;
  statusCode: number;
  method: string;
  route: string;
}) {
  const now = Date.now();
  events.push({
    at: now,
    durationMs: input.durationMs,
    statusCode: input.statusCode,
    method: input.method,
    route: input.route || 'unknown',
  });
  prune(now);
}

export function getRequestMetrics(now = Date.now()) {
  prune(now);

  const totalInWindow = events.length;
  const errorCount = events.filter((event) => event.statusCode >= 500).length;
  const clientErrorCount = events.filter(
    (event) => event.statusCode >= 400 && event.statusCode < 500,
  ).length;

  const avgLatencyMs =
    totalInWindow === 0
      ? 0
      : events.reduce((sum, event) => sum + event.durationMs, 0) / totalInWindow;

  const routeHits = new Map<string, number>();
  for (const event of events) {
    const key = `${event.method} ${event.route}`;
    routeHits.set(key, (routeHits.get(key) ?? 0) + 1);
  }

  const topRoutes = [...routeHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([route, count]) => ({ route, count }));

  const statusBuckets = {
    '2xx': events.filter((event) => event.statusCode < 300).length,
    '3xx': events.filter(
      (event) => event.statusCode >= 300 && event.statusCode < 400,
    ).length,
    '4xx': clientErrorCount,
    '5xx': errorCount,
  };

  return {
    windowSeconds: WINDOW_MS / 1000,
    requestsInWindow: totalInWindow,
    requestsPerSecond: Number((totalInWindow / (WINDOW_MS / 1000)).toFixed(2)),
    avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
    errorRate:
      totalInWindow === 0
        ? 0
        : Number(((errorCount / totalInWindow) * 100).toFixed(2)),
    statusBuckets,
    topRoutes,
    processStartedAt: new Date(startedAt).toISOString(),
  };
}

export function sampleCpuPercent(cpuCount: number) {
  const now = Date.now();
  const current = process.cpuUsage();
  const elapsedMs = Math.max(1, now - previousCpuAt);

  const userDiffMicros = current.user - previousCpu.user;
  const systemDiffMicros = current.system - previousCpu.system;
  const totalCpuMs = (userDiffMicros + systemDiffMicros) / 1000;

  previousCpu = current;
  previousCpuAt = now;

  const percent = (totalCpuMs / (elapsedMs * Math.max(1, cpuCount))) * 100;
  return Number(Math.min(100, Math.max(0, percent)).toFixed(2));
}
