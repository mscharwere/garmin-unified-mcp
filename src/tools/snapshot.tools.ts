// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema } from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerSnapshotTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_daily_health_snapshot',
    'Get complete daily health snapshot in a single call: summary, heart rate, stress, body battery, sleep, HRV, respiration, SpO2, steps, floors, intensity minutes. Calls ~11 endpoints in parallel. Use yesterday if today has no data yet',
    dateParamSchema.shape,
    (client, { date }) => client.getDailyHealthSnapshot(date),
  );
}
