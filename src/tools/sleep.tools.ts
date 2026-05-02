// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema } from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerSleepTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_sleep_data',
    {
      description:
        'Get detailed sleep data for a single night: duration, sleep stages (deep, light, REM, awake), sleep score, bed/wake times. For multiple nights use get_sleep_data_range',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_sleep_data', (client) =>
        client.getSleepData(date),
      );
    },
  );

  server.registerTool(
    'get_sleep_data_raw',
    {
      description:
        'Get raw sleep data directly from the wellness service with full detail including heart rate and SpO2 during sleep',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_sleep_data_raw', (client) =>
        client.getSleepDataRaw(date),
      );
    },
  );
}
