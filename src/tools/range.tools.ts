// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { dateRangeParamSchema } from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerRangeTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_sleep_data_range',
    {
      description: 'Get sleep data over a date range (day-by-day). Returns array of {date, data} records with sleep stages, score, duration',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_sleep_data_range', (c) => c.getSleepDataRange(startDate, endDate)),
  );

  server.registerTool(
    'get_hrv_range',
    {
      description: 'Get HRV data over a date range (day-by-day). Returns array of {date, data} records',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_hrv_range', (c) => c.getHRVRange(startDate, endDate)),
  );

  server.registerTool(
    'get_stress_range',
    {
      description: 'Get daily stress data over a date range (day-by-day). Returns array of {date, data} records',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_stress_range', (c) => c.getStressRange(startDate, endDate)),
  );

  server.registerTool(
    'get_spo2_range',
    {
      description: 'Get SpO2 (blood oxygen) data over a date range (day-by-day). Returns array of {date, data} records',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_spo2_range', (c) => c.getSpO2Range(startDate, endDate)),
  );

  server.registerTool(
    'get_respiration_range',
    {
      description: 'Get respiration data over a date range (day-by-day). Returns array of {date, data} records',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_respiration_range', (c) => c.getRespirationRange(startDate, endDate)),
  );

  server.registerTool(
    'get_training_readiness_range',
    {
      description: 'Get Training Readiness data over a date range (day-by-day). Returns array of {date, data} records',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_training_readiness_range', (c) => c.getTrainingReadinessRange(startDate, endDate)),
  );

  server.registerTool(
    'get_vo2max_range',
    {
      description: 'Get VO2 Max data over a date range (day-by-day). Returns array of {date, data} records',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_vo2max_range', (c) => c.getVO2MaxRange(startDate, endDate)),
  );
}
