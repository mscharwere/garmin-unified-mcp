// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import {
  dateParamSchema,
  getRacePredictionsSchema,
  getLactateThresholdSchema,
  getScoreSchema,
} from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerPerformanceTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_vo2max',
    'Get VO2 Max estimate for a date (running and cycling). Data may not be available for today, use yesterday. For ranges use get_vo2max_range',
    dateParamSchema.shape,
    (client, { date }) => client.getVO2Max(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_training_readiness',
    'Get Training Readiness score: combines sleep, recovery, training load and HRV. Data may not be available for today, use yesterday. For ranges use get_training_readiness_range',
    dateParamSchema.shape,
    (client, { date }) => client.getTrainingReadiness(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_training_status',
    'Get Training Status: productive, maintaining, detraining, peaking, recovery, overreaching. Includes training load. Data may not be available for today',
    dateParamSchema.shape,
    (client, { date }) => client.getTrainingStatus(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_hrv',
    'Get Heart Rate Variability (HRV) data. Key recovery indicator. Data may not be available for today, use yesterday. For ranges use get_hrv_range',
    dateParamSchema.shape,
    (client, { date }) => client.getHRV(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_endurance_score',
    'Get Endurance Score. Single date: omit endDate. Date range: provide both with optional aggregation (daily/weekly/monthly)',
    getScoreSchema.shape,
    (client, { startDate, endDate, aggregation }) => client.getEnduranceScore(startDate, endDate, aggregation),
  );

  registerCompactedTool(
    server, clientPool, 'get_hill_score',
    'Get Hill Score. Single date: omit endDate. Date range: provide both with optional aggregation (daily/weekly/monthly)',
    getScoreSchema.shape,
    (client, { startDate, endDate, aggregation }) => client.getHillScore(startDate, endDate, aggregation),
  );

  registerCompactedTool(
    server, clientPool, 'get_race_predictions',
    'Get race time predictions for 5K, 10K, half marathon, and marathon. Omit dates for latest. Provide dates for historical (daily/monthly)',
    getRacePredictionsSchema.shape,
    (client, { startDate, endDate, type }) => client.getRacePredictions(startDate, endDate, type ?? 'daily'),
  );

  registerCompactedTool(
    server, clientPool, 'get_fitness_age',
    'Get Garmin Fitness Age estimate based on fitness level, activity, and body metrics',
    dateParamSchema.shape,
    (client, { date }) => client.getFitnessAge(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_personal_records',
    'Get personal records: longest run, fastest 5K/10K/half/full marathon, longest ride',
    {},
    (client) => client.getPersonalRecords(),
  );

  registerCompactedTool(
    server, clientPool, 'get_lactate_threshold',
    'Get lactate threshold data: HR and pace. Omit dates for latest. Provide dates for historical trend with aggregation (daily/weekly/monthly)',
    getLactateThresholdSchema.shape,
    (client, { startDate, endDate, aggregation }) => client.getLactateThreshold(startDate, endDate, aggregation ?? 'daily'),
  );

  registerCompactedTool(
    server, clientPool, 'get_cycling_ftp',
    'Get latest Functional Threshold Power (FTP) for cycling',
    {},
    (client) => client.getCyclingFTP(),
  );
}
