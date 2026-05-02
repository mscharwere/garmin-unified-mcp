// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { dateRangeParamSchema, weeklyParamSchema } from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerTrendTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_daily_steps_range',
    {
      description: 'Get daily step counts over a date range for trend analysis. Auto-chunks ranges >28 days',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_daily_steps_range', (c) => c.getDailySteps(startDate, endDate)),
  );

  server.registerTool(
    'get_weekly_steps',
    {
      description: 'Get weekly aggregated step counts for trend analysis. Defaults to 52 weeks (1 year). Max 52 weeks',
      inputSchema: { user: userEnum, ...weeklyParamSchema.shape },
    },
    async ({ user, endDate, weeks }) => callWithBreaker(clientPool, user, 'get_weekly_steps', (c) => c.getWeeklySteps(endDate, weeks ?? 52)),
  );

  server.registerTool(
    'get_weekly_stress',
    {
      description: 'Get weekly aggregated stress data for trend analysis. Defaults to 52 weeks (1 year). Max 52 weeks',
      inputSchema: { user: userEnum, ...weeklyParamSchema.shape },
    },
    async ({ user, endDate, weeks }) => callWithBreaker(clientPool, user, 'get_weekly_stress', (c) => c.getWeeklyStress(endDate, weeks ?? 52)),
  );

  server.registerTool(
    'get_weekly_intensity_minutes',
    {
      description: 'Get weekly intensity minutes over a date range',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_weekly_intensity_minutes', (c) => c.getWeeklyIntensityMinutes(startDate, endDate)),
  );
}
