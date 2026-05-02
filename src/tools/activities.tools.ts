// KAREN Phase 1 (2026-05-02): refactored registerActivityTools(server, client) →
// registerActivityTools(server, clientPool). Each tool prepends `user` Zod enum,
// resolves client via clientPool.get(args.user), wraps with callWithBreaker for
// per-tool error isolation + per-user circuit-breaker (§3). See FORK_PATCH.md.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import {
  getActivitiesSchema,
  getActivitiesByDateSchema,
  getActivitySchema,
  getProgressSummarySchema,
} from '../dtos';
import { DEFAULT_ACTIVITIES_LIMIT } from '../constants/garmin-endpoints';
import { callWithBreaker } from './tool-helpers.js';

export function registerActivityTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_activities',
    {
      description:
        'Get recent activities with pagination. Returns activity summaries: type, duration, distance, calories, heart rate',
      inputSchema: { user: userEnum, ...getActivitiesSchema.shape },
    },
    async ({ user, start, limit, activityType }) => {
      return callWithBreaker(clientPool, user, 'get_activities', (client) =>
        client.getActivities(start ?? 0, limit ?? DEFAULT_ACTIVITIES_LIMIT, activityType),
      );
    },
  );

  server.registerTool(
    'get_activities_by_date',
    {
      description:
        'Search activities within a date range, optionally filtered by activity type (running, cycling, etc.)',
      inputSchema: { user: userEnum, ...getActivitiesByDateSchema.shape },
    },
    async ({ user, startDate, endDate, activityType }) => {
      return callWithBreaker(clientPool, user, 'get_activities_by_date', (client) =>
        client.getActivitiesByDate(startDate, endDate, activityType),
      );
    },
  );

  server.registerTool(
    'get_last_activity',
    {
      description: 'Get the most recent activity',
      inputSchema: { user: userEnum },
    },
    async ({ user }) => {
      return callWithBreaker(clientPool, user, 'get_last_activity', (client) =>
        client.getLastActivity(),
      );
    },
  );

  server.registerTool(
    'count_activities',
    {
      description: 'Get total number of activities',
      inputSchema: { user: userEnum },
    },
    async ({ user }) => {
      return callWithBreaker(clientPool, user, 'count_activities', (client) =>
        client.countActivities(),
      );
    },
  );

  server.registerTool(
    'get_activity',
    {
      description: 'Get summary data for a specific activity',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity', (client) =>
        client.getActivity(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_details',
    {
      description:
        'Get detailed activity metrics: HR, pace, elevation, cadence, power time series data',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_details', (client) =>
        client.getActivityDetails(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_splits',
    {
      description: 'Get per-km or per-mile split data for an activity',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_splits', (client) =>
        client.getActivitySplits(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_weather',
    {
      description:
        'Get weather conditions during an activity: temperature, humidity, wind, condition',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_weather', (client) =>
        client.getActivityWeather(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_hr_zones',
    {
      description: 'Get time spent in each heart rate zone during an activity',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_hr_zones', (client) =>
        client.getActivityHrZones(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_exercise_sets',
    {
      description:
        'Get exercise set details for strength training activities: reps, weight, duration per set',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_exercise_sets', (client) =>
        client.getActivityExerciseSets(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_types',
    {
      description: 'Get all available activity types (running, cycling, swimming, etc.)',
      inputSchema: { user: userEnum },
    },
    async ({ user }) => {
      return callWithBreaker(clientPool, user, 'get_activity_types', (client) =>
        client.getActivityTypes(),
      );
    },
  );

  server.registerTool(
    'get_activity_gear',
    {
      description: 'Get gear/equipment used during a specific activity',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_gear', (client) =>
        client.getActivityGear(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_typed_splits',
    {
      description: 'Get typed split data for an activity (e.g. active vs rest intervals)',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_typed_splits', (client) =>
        client.getActivityTypedSplits(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_split_summaries',
    {
      description: 'Get split summary data for an activity with aggregate stats per split',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_split_summaries', (client) =>
        client.getActivitySplitSummaries(activityId),
      );
    },
  );

  server.registerTool(
    'get_activity_power_in_timezones',
    {
      description: 'Get power time in zones for cycling/running power activities',
      inputSchema: { user: userEnum, ...getActivitySchema.shape },
    },
    async ({ user, activityId }) => {
      return callWithBreaker(clientPool, user, 'get_activity_power_in_timezones', (client) =>
        client.getActivityPowerInTimezones(activityId),
      );
    },
  );

  server.registerTool(
    'get_progress_summary',
    {
      description:
        'Get fitness progress stats over a date range: distance, duration, or calories grouped by activity type',
      inputSchema: { user: userEnum, ...getProgressSummarySchema.shape },
    },
    async ({ user, startDate, endDate, metric }) => {
      return callWithBreaker(clientPool, user, 'get_progress_summary', (client) =>
        client.getProgressSummary(startDate, endDate, metric ?? 'distance'),
      );
    },
  );
}
