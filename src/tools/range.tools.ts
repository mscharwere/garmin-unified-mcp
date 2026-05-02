// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { dateRangeParamSchema } from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerRangeTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_sleep_data_range',
    'Get sleep data over a date range (day-by-day). Returns array of {date, data} records with sleep stages, score, duration',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getSleepDataRange(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_hrv_range',
    'Get HRV data over a date range (day-by-day). Returns array of {date, data} records. BAYMAX uses 90-day range for baseline computation',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getHRVRange(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_stress_range',
    'Get daily stress data over a date range (day-by-day). Returns array of {date, data} records',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getStressRange(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_spo2_range',
    'Get SpO2 (blood oxygen) data over a date range (day-by-day). Returns array of {date, data} records',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getSpO2Range(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_respiration_range',
    'Get respiration data over a date range (day-by-day). Returns array of {date, data} records',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getRespirationRange(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_training_readiness_range',
    'Get Training Readiness data over a date range (day-by-day). Returns array of {date, data} records',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getTrainingReadinessRange(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_vo2max_range',
    'Get VO2 Max data over a date range (day-by-day). Returns array of {date, data} records',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getVO2MaxRange(startDate, endDate),
  );
}
