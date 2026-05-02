// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema, getMenstrualCalendarSchema } from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerWellnessTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_menstrual_calendar_data',
    'Get menstrual cycle calendar data for a date range: cycle phases, predictions, symptoms',
    getMenstrualCalendarSchema.shape,
    (c, { startDate, endDate }) => c.getMenstrualCalendar(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_menstrual_data_for_date',
    'Get menstrual cycle day view for a specific date: current phase, symptoms, predictions',
    dateParamSchema.shape,
    (c, { date }) => c.getMenstrualDataForDate(date),
  );

  registerCompactedTool(server, clientPool, 'get_pregnancy_summary', 'Get pregnancy summary data', {}, (c) => c.getPregnancySummary());
  registerCompactedTool(server, clientPool, 'get_lifestyle_logging_data', 'Get lifestyle logging data for a date (food, water, sleep entries)', dateParamSchema.shape, (c, { date }) => c.getLifestyleLoggingData(date));
}
