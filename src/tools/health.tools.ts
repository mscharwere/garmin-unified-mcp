// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema, dateRangeOptionalEndSchema } from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerHealthTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_daily_summary',
    'Get full daily summary: steps, calories, distance, floors, active minutes, heart rate, stress, body battery',
    dateParamSchema.shape,
    (client, { date }) => client.getDailySummary(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_steps',
    'Get step count for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getDailySummary(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_steps_chart',
    'Get detailed intraday step data throughout the day (step chart)',
    dateParamSchema.shape,
    (client, { date }) => client.getStepsChart(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_heart_rate',
    'Get daily heart rate data: resting HR, max HR, min HR, and time series throughout the day',
    dateParamSchema.shape,
    (client, { date }) => client.getHeartRate(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_resting_heart_rate',
    'Get resting heart rate data for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getRestingHeartRate(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_stress',
    'Get daily stress levels: overall score, time in rest/low/medium/high stress, and time series. Single date; for ranges use get_stress_range',
    dateParamSchema.shape,
    (client, { date }) => client.getStress(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_body_battery',
    'Get Body Battery energy levels: charged, drained, highest, lowest. endDate defaults to startDate if omitted',
    dateRangeOptionalEndSchema.shape,
    (client, { startDate, endDate }) => client.getBodyBattery(startDate, endDate ?? startDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_body_battery_events',
    'Get Body Battery charge and drain events for a day (what charged/drained your battery)',
    dateParamSchema.shape,
    (client, { date }) => client.getBodyBatteryEvents(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_respiration',
    'Get daily respiration rate data throughout the day. Single date; for ranges use get_respiration_range',
    dateParamSchema.shape,
    (client, { date }) => client.getRespiration(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_spo2',
    'Get blood oxygen saturation (SpO2) data for a specific date. Single date; for ranges use get_spo2_range',
    dateParamSchema.shape,
    (client, { date }) => client.getSpO2(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_intensity_minutes',
    'Get moderate and vigorous intensity minutes for a date',
    dateParamSchema.shape,
    (client, { date }) => client.getIntensityMinutes(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_floors',
    'Get floors climbed chart data for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getFloors(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_hydration',
    'Get daily hydration data (water intake)',
    dateParamSchema.shape,
    (client, { date }) => client.getHydration(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_daily_events',
    'Get daily wellness events for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getDailyEvents(date),
  );
}
