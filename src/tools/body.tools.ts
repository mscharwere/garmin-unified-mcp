// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema, dateRangeParamSchema } from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerBodyTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_body_composition',
    'Get body composition data over a date range: weight, BMI, body fat %, muscle mass, bone mass, body water %',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getBodyComposition(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_latest_weight',
    'Get the most recent weight entry',
    {},
    (client) => client.getDailyWeighIns(),
  );

  registerCompactedTool(
    server, clientPool, 'get_daily_weigh_ins',
    'Get all weigh-in entries for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getDailyWeighIns(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_weigh_ins',
    'Get weigh-in records over a date range',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getWeighIns(startDate, endDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_blood_pressure',
    'Get blood pressure readings over a date range',
    dateRangeParamSchema.shape,
    (client, { startDate, endDate }) => client.getBloodPressure(startDate, endDate),
  );
}
