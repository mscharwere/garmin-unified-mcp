// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import {
  dateParamSchema,
  getRacePredictionsSchema,
  getLactateThresholdSchema,
  getScoreSchema,
} from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerPerformanceTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_vo2max',
    {
      description: 'Get VO2 Max estimate for a date (running and cycling). Data may not be available for today, use yesterday. For ranges use get_vo2max_range',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => callWithBreaker(clientPool, user, 'get_vo2max', (c) => c.getVO2Max(date)),
  );

  server.registerTool(
    'get_training_readiness',
    {
      description: 'Get Training Readiness score: combines sleep, recovery, training load and HRV. Data may not be available for today, use yesterday. For ranges use get_training_readiness_range',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => callWithBreaker(clientPool, user, 'get_training_readiness', (c) => c.getTrainingReadiness(date)),
  );

  server.registerTool(
    'get_training_status',
    {
      description: 'Get Training Status: productive, maintaining, detraining, peaking, recovery, overreaching. Includes training load. Data may not be available for today',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => callWithBreaker(clientPool, user, 'get_training_status', (c) => c.getTrainingStatus(date)),
  );

  server.registerTool(
    'get_hrv',
    {
      description: 'Get Heart Rate Variability (HRV) data. Key recovery indicator. Data may not be available for today, use yesterday. For ranges use get_hrv_range',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => callWithBreaker(clientPool, user, 'get_hrv', (c) => c.getHRV(date)),
  );

  server.registerTool(
    'get_endurance_score',
    {
      description: 'Get Endurance Score. Single date: omit endDate. Date range: provide both with optional aggregation (daily/weekly/monthly)',
      inputSchema: { user: userEnum, ...getScoreSchema.shape },
    },
    async ({ user, startDate, endDate, aggregation }) =>
      callWithBreaker(clientPool, user, 'get_endurance_score', (c) => c.getEnduranceScore(startDate, endDate, aggregation)),
  );

  server.registerTool(
    'get_hill_score',
    {
      description: 'Get Hill Score. Single date: omit endDate. Date range: provide both with optional aggregation (daily/weekly/monthly)',
      inputSchema: { user: userEnum, ...getScoreSchema.shape },
    },
    async ({ user, startDate, endDate, aggregation }) =>
      callWithBreaker(clientPool, user, 'get_hill_score', (c) => c.getHillScore(startDate, endDate, aggregation)),
  );

  server.registerTool(
    'get_race_predictions',
    {
      description: 'Get race time predictions for 5K, 10K, half marathon, and marathon. Omit dates for latest. Provide dates for historical (daily/monthly)',
      inputSchema: { user: userEnum, ...getRacePredictionsSchema.shape },
    },
    async ({ user, startDate, endDate, type }) =>
      callWithBreaker(clientPool, user, 'get_race_predictions', (c) => c.getRacePredictions(startDate, endDate, type ?? 'daily')),
  );

  server.registerTool(
    'get_fitness_age',
    {
      description: 'Get Garmin Fitness Age estimate based on fitness level, activity, and body metrics',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => callWithBreaker(clientPool, user, 'get_fitness_age', (c) => c.getFitnessAge(date)),
  );

  server.registerTool(
    'get_personal_records',
    {
      description: 'Get personal records: longest run, fastest 5K/10K/half/full marathon, longest ride',
      inputSchema: { user: userEnum },
    },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_personal_records', (c) => c.getPersonalRecords()),
  );

  server.registerTool(
    'get_lactate_threshold',
    {
      description: 'Get lactate threshold data: HR and pace. Omit dates for latest. Provide dates for historical trend with aggregation (daily/weekly/monthly)',
      inputSchema: { user: userEnum, ...getLactateThresholdSchema.shape },
    },
    async ({ user, startDate, endDate, aggregation }) =>
      callWithBreaker(clientPool, user, 'get_lactate_threshold', (c) => c.getLactateThreshold(startDate, endDate, aggregation ?? 'daily')),
  );

  server.registerTool(
    'get_cycling_ftp',
    {
      description: 'Get latest Functional Threshold Power (FTP) for cycling',
      inputSchema: { user: userEnum },
    },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_cycling_ftp', (c) => c.getCyclingFTP()),
  );
}
