// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { dateRangeParamSchema, weeklyParamSchema } from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerTrendTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_daily_steps_range',
    'Get daily step counts over a date range for trend analysis. Auto-chunks ranges >28 days',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getDailySteps(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_weekly_steps',
    'Get weekly aggregated step counts for trend analysis. Defaults to 52 weeks (1 year). Max 52 weeks',
    weeklyParamSchema.shape,
    (client, { endDate, weeks }) => client.getWeeklySteps(endDate, weeks ?? 52),
  );

  registerCompactedTool(
    server, clientPool, 'get_weekly_stress',
    'Get weekly aggregated stress data for trend analysis. Defaults to 52 weeks (1 year). Max 52 weeks',
    weeklyParamSchema.shape,
    (client, { endDate, weeks }) => client.getWeeklyStress(endDate, weeks ?? 52),
  );

  registerCompactedTool(
    server, clientPool, 'get_weekly_intensity_minutes',
    'Get weekly intensity minutes over a date range',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getWeeklyIntensityMinutes(startDate, endDate),
  );
}
