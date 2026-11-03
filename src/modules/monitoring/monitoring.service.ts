import os from 'node:os';
import { prisma } from '../../lib/prisma.js';
import {
  getRequestMetrics,
  sampleCpuPercent,
} from './metrics.collector.js';

function bytesToMb(bytes: number) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

async function getDatabaseHealth() {
  const started = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'up' as const,
      latencyMs: Date.now() - started,
    };
  } catch {
    return {
      status: 'down' as const,
      latencyMs: Date.now() - started,
    };
  }
}

async function getUserStats() {
  const [total, active, inactive, byRole, recentLogins] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { lastLogin: { not: null } },
      orderBy: { lastLogin: 'desc' },
      take: 6,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLogin: true,
      },
    }),
  ]);

  return {
    total,
    active,
    inactive,
    byRole: byRole.map((row) => ({
      role: row.role,
      count: row._count._all,
    })),
    recentLogins,
  };
}

export async function getMonitoringSnapshot() {
  const cpus = os.cpus();
  const memory = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const [database, users] = await Promise.all([
    getDatabaseHealth(),
    getUserStats(),
  ]);

  const cpuPercent = sampleCpuPercent(cpus.length || 1);
  const traffic = getRequestMetrics();

  return {
    timestamp: new Date().toISOString(),
    status: database.status === 'up' ? ('healthy' as const) : ('degraded' as const),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Number(process.uptime().toFixed(0)),
      cpuPercent,
      memory: {
        rssMb: bytesToMb(memory.rss),
        heapUsedMb: bytesToMb(memory.heapUsed),
        heapTotalMb: bytesToMb(memory.heapTotal),
        externalMb: bytesToMb(memory.external),
      },
    },
    host: {
      hostname: os.hostname(),
      uptimeSeconds: Number(os.uptime().toFixed(0)),
      loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
      cpuCount: cpus.length,
      memory: {
        totalMb: bytesToMb(totalMem),
        usedMb: bytesToMb(usedMem),
        freeMb: bytesToMb(freeMem),
        usedPercent: Number(((usedMem / totalMem) * 100).toFixed(2)),
      },
    },
    database,
    traffic,
    users,
  };
}

export type MonitoringSnapshot = Awaited<
  ReturnType<typeof getMonitoringSnapshot>
>;
