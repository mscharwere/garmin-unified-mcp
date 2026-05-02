// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema, dateRangeOptionalEndSchema } from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerHealthTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_daily_summary',
    {
      description:
        'Get full daily summary: steps, calories, distance, floors, active minutes, heart rate, stress, body battery',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_daily_summary', (client) =>
        client.getDailySummary(date),
      );
    },
  );

  server.registerTool(
    'get_steps',
    {
      description: 'Get step count for a specific date',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_steps', (client) =>
        client.getDailySummary(date),
      );
    },
  );

  server.registerTool(
    'get_steps_chart',
    {
      description: 'Get detailed intraday step data throughout the day (step chart)',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_steps_chart', (client) =>
        client.getStepsChart(date),
      );
    },
  );

  server.registerTool(
    'get_heart_rate',
    {
      description:
        'Get daily heart rate data: resting HR, max HR, min HR, and time series throughout the day',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_heart_rate', (client) =>
        client.getHeartRate(date),
      );
    },
  );

  server.registerTool(
    'get_resting_heart_rate',
    {
      description: 'Get resting heart rate data for a specific date',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_resting_heart_rate', (client) =>
        client.getRestingHeartRate(date),
      );
    },
  );

  server.registerTool(
    'get_stress',
    {
      description:
        'Get daily stress levels: overall score, time in rest/low/medium/high stress, and time series. Single date; for ranges use get_stress_range',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_stress', (client) =>
        client.getStress(date),
      );
    },
  );

  server.registerTool(
    'get_body_battery',
    {
      description:
        'Get Body Battery energy levels: charged, drained, highest, lowest. endDate defaults to startDate if omitted',
      inputSchema: { user: userEnum, ...dateRangeOptionalEndSchema.shape },
    },
    async ({ user, startDate, endDate }) => {
      return callWithBreaker(clientPool, user, 'get_body_battery', (client) =>
        client.getBodyBattery(startDate, endDate ?? startDate),
      );
    },
  );

  server.registerTool(
    'get_body_battery_events',
    {
      description: 'Get Body Battery charge and drain events for a day (what charged/drained your battery)',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_body_battery_events', (client) =>
        client.getBodyBatteryEvents(date),
      );
    },
  );

  server.registerTool(
    'get_respiration',
    {
      description: 'Get daily respiration rate data throughout the day. Single date; for ranges use get_respiration_range',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_respiration', (client) =>
        client.getRespiration(date),
      );
    },
  );

  server.registerTool(
    'get_spo2',
    {
      description: 'Get blood oxygen saturation (SpO2) data for a specific date. Single date; for ranges use get_spo2_range',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_spo2', (client) =>
        client.getSpO2(date),
      );
    },
  );

  server.registerTool(
    'get_intensity_minutes',
    {
      description: 'Get moderate and vigorous intensity minutes for a date',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_intensity_minutes', (client) =>
        client.getIntensityMinutes(date),
      );
    },
  );

  server.registerTool(
    'get_floors',
    {
      description: 'Get floors climbed chart data for a specific date',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_floors', (client) =>
        client.getFloors(date),
      );
    },
  );

  server.registerTool(
    'get_hydration',
    {
      description: 'Get daily hydration data (water intake)',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_hydration', (client) =>
        client.getHydration(date),
      );
    },
  );

  server.registerTool(
    'get_daily_events',
    {
      description: 'Get daily wellness events for a specific date',
      inputSchema: { user: userEnum, ...dateParamSchema.shape },
    },
    async ({ user, date }) => {
      return callWithBreaker(clientPool, user, 'get_daily_events', (client) =>
        client.getDailyEvents(date),
      );
    },
  );
}
