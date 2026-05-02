// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema } from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerSnapshotTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_daily_health_snapshot',
    {
      description:
        'Get complete daily health snapshot in a single call: summary, heart rate, stress, body battery, sleep, HRV, respiration, SpO2, steps, floors, intensity minutes. Calls ~11 endpoints in parallel. Use yesterday if today has no data yet',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => callWithBreaker(clientPool, user, 'get_daily_health_snapshot', (c) => c.getDailyHealthSnapshot(date)),
  );
}
