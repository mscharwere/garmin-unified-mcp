// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
// Note: get_sleep_data_raw compactor = identity — verbose flag has no effect on it.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema } from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerSleepTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_sleep_data',
    'Get detailed sleep data for a single night: duration, sleep stages (deep, light, REM, awake), sleep score, bed/wake times. For multiple nights use get_sleep_data_range',
    dateParamSchema.shape,
    (client, { date }) => client.getSleepData(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_sleep_data_raw',
    'Get raw sleep data directly from the wellness service with full detail including heart rate and SpO2 during sleep. Always returns raw upstream payload — verbose flag has no effect.',
    dateParamSchema.shape,
    (client, { date }) => client.getSleepDataRaw(date),
  );
}
