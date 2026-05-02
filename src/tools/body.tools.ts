// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema, dateRangeParamSchema } from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerBodyTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_body_composition',
    {
      description:
        'Get body composition data over a date range: weight, BMI, body fat %, muscle mass, bone mass, body water %',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => {
      return callWithBreaker(clientPool, user, 'get_body_composition', (client) =>
        client.getBodyComposition(startDate, endDate),
      );
    },
  );

  server.registerTool(
    'get_latest_weight',
    {
      description: 'Get the most recent weight entry',
      inputSchema: { user: userEnum },
    },
    async ({ user }) => {
      return callWithBreaker(clientPool, user, 'get_latest_weight', (client) =>
        client.getDailyWeighIns(),
      );
    },
  );

  server.registerTool(
    'get_daily_weigh_ins',
    {
      description: 'Get all weigh-in entries for a specific date',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_daily_weigh_ins', (client) =>
        client.getDailyWeighIns(date),
      );
    },
  );

  server.registerTool(
    'get_weigh_ins',
    {
      description: 'Get weigh-in records over a date range',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => {
      return callWithBreaker(clientPool, user, 'get_weigh_ins', (client) =>
        client.getWeighIns(startDate, endDate),
      );
    },
  );

  server.registerTool(
    'get_blood_pressure',
    {
      description: 'Get blood pressure readings over a date range',
      inputSchema: { user: userEnum, ...dateRangeParamSchema.shape },
    },
    async ({ user, startDate, endDate }) => {
      return callWithBreaker(clientPool, user, 'get_blood_pressure', (client) =>
        client.getBloodPressure(startDate, endDate),
      );
    },
  );
}
