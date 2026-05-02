// KAREN Phase 1 (2026-05-02): refactored registerActivityTools(server, client) →
// registerActivityTools(server, clientPool). Each tool prepends `user` Zod enum,
// resolves client via clientPool.get(args.user), wraps with callWithBreaker for
// per-tool error isolation + per-user circuit-breaker (§3). See FORK_PATCH.md.
//
// KAREN Phase 2 (2026-05-02): converted all tools to registerCompactedTool.
// Adds `verbose: boolean` (default false) to every tool. When false, response is
// compacted per compactors.ts; when true, raw upstream JSON returned. See design §10.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import {
  getActivitiesSchema,
  getActivitiesByDateSchema,
  getActivitySchema,
  getProgressSummarySchema,
} from '../dtos';
import { DEFAULT_ACTIVITIES_LIMIT } from '../constants/garmin-endpoints';
import { registerCompactedTool } from '../register-helpers.js';

export function registerActivityTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_activities',
    'Get recent activities with pagination. Returns activity summaries: type, duration, distance, calories, heart rate',
    getActivitiesSchema.shape,
    (client, { start, limit, activityType }) =>
      client.getActivities(start ?? 0, limit ?? DEFAULT_ACTIVITIES_LIMIT, activityType),
  );

  registerCompactedTool(
    server, clientPool, 'get_activities_by_date',
    'Search activities within a date range, optionally filtered by activity type (running, cycling, etc.)',
    getActivitiesByDateSchema.shape,
    (client, { startDate, endDate, activityType }) =>
      client.getActivitiesByDate(startDate, endDate, activityType),
  );

  registerCompactedTool(server, clientPool, 'get_last_activity', 'Get the most recent activity', {}, (client) => client.getLastActivity());
  registerCompactedTool(server, clientPool, 'count_activities', 'Get total number of activities', {}, (client) => client.countActivities());

  registerCompactedTool(
    server, clientPool, 'get_activity',
    'Get summary data for a specific activity',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivity(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_activity_details',
    'Get detailed activity metrics: HR, pace, elevation, cadence, power time series data. Use verbose=true for per-second arrays.',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivityDetails(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_activity_splits',
    'Get per-km or per-mile split data for an activity',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivitySplits(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_activity_weather',
    'Get weather conditions during an activity: temperature, humidity, wind, condition',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivityWeather(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_activity_hr_zones',
    'Get time spent in each heart rate zone during an activity',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivityHrZones(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_activity_exercise_sets',
    'Get exercise set details for strength training activities: reps, weight, duration per set',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivityExerciseSets(activityId),
  );

  registerCompactedTool(server, clientPool, 'get_activity_types', 'Get all available activity types (running, cycling, swimming, etc.)', {}, (client) => client.getActivityTypes());

  registerCompactedTool(
    server, clientPool, 'get_activity_gear',
    'Get gear/equipment used during a specific activity',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivityGear(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_activity_typed_splits',
    'Get typed split data for an activity (e.g. active vs rest intervals)',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivityTypedSplits(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_activity_split_summaries',
    'Get split summary data for an activity with aggregate stats per split',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivitySplitSummaries(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_activity_power_in_timezones',
    'Get power time in zones for cycling/running power activities',
    getActivitySchema.shape,
    (client, { activityId }) => client.getActivityPowerInTimezones(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'get_progress_summary',
    'Get fitness progress stats over a date range: distance, duration, or calories grouped by activity type',
    getProgressSummarySchema.shape,
    (client, { startDate, endDate, metric }) =>
      client.getProgressSummary(startDate, endDate, metric ?? 'distance'),
  );
}
