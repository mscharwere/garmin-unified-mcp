// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema, getMenstrualCalendarSchema } from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerWellnessTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_menstrual_calendar_data',
    {
      description: 'Get menstrual cycle calendar data for a date range: cycle phases, predictions, symptoms',
      inputSchema: { user: userEnum, ...getMenstrualCalendarSchema.shape },
    },
    async ({ user, startDate, endDate }) => callWithBreaker(clientPool, user, 'get_menstrual_calendar_data', (c) => c.getMenstrualCalendar(startDate, endDate)),
  );

  server.registerTool(
    'get_menstrual_data_for_date',
    {
      description: 'Get menstrual cycle day view for a specific date: current phase, symptoms, predictions',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => callWithBreaker(clientPool, user, 'get_menstrual_data_for_date', (c) => c.getMenstrualDataForDate(date)),
  );

  server.registerTool(
    'get_pregnancy_summary',
    { description: 'Get pregnancy tracking summary data', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_pregnancy_summary', (c) => c.getPregnancySummary()),
  );

  server.registerTool(
    'get_lifestyle_logging_data',
    {
      description: 'Get daily lifestyle logging data for a date',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => callWithBreaker(clientPool, user, 'get_lifestyle_logging_data', (c) => c.getLifestyleLoggingData(date)),
  );
}
