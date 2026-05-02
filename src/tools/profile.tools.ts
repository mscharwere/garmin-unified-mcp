// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import {
  getDeviceSettingsSchema,
  getDeviceSolarSchema,
  getGearStatsSchema,
  getGearActivitiesSchema,
  getWorkoutSchema,
} from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerProfileTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_user_profile',
    { description: 'Get user social profile: name, location, profile image, activity preferences, level', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_user_profile', (c) => c.getUserProfile()),
  );

  server.registerTool(
    'get_user_settings',
    { description: 'Get user settings: measurement system, time/date format, sleep schedule, HR zones, hydration preferences', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_user_settings', (c) => c.getUserSettings()),
  );

  server.registerTool(
    'get_devices',
    { description: 'Get all registered Garmin devices: model, firmware, last sync', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_devices', (c) => c.getDevices()),
  );

  server.registerTool(
    'get_device_settings',
    { description: 'Get settings and configuration for a specific Garmin device', inputSchema: { user: userEnum, ...getDeviceSettingsSchema.shape } },
    async ({ user, deviceId }) => callWithBreaker(clientPool, user, 'get_device_settings', (c) => c.getDeviceSettings(deviceId)),
  );

  server.registerTool(
    'get_device_last_used',
    { description: 'Get the last used Garmin device info', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_device_last_used', (c) => c.getDeviceLastUsed()),
  );

  server.registerTool(
    'get_primary_training_device',
    { description: 'Get the primary training device info', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_primary_training_device', (c) => c.getPrimaryTrainingDevice()),
  );

  server.registerTool(
    'get_device_solar_data',
    { description: 'Get solar charging data for solar-equipped Garmin devices', inputSchema: { user: userEnum, ...getDeviceSolarSchema.shape } },
    async ({ user, deviceId, startDate, endDate }) =>
      callWithBreaker(clientPool, user, 'get_device_solar_data', (c) => c.getDeviceSolarData(deviceId, startDate, endDate)),
  );

  server.registerTool(
    'get_gear',
    { description: 'Get all gear/equipment: shoes, bikes, and other tracked equipment', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_gear', (c) => c.getGear()),
  );

  server.registerTool(
    'get_gear_stats',
    { description: 'Get usage statistics for a specific gear item (total distance, activities)', inputSchema: { user: userEnum, ...getGearStatsSchema.shape } },
    async ({ user, gearUuid }) => callWithBreaker(clientPool, user, 'get_gear_stats', (c) => c.getGearStats(gearUuid)),
  );

  server.registerTool(
    'get_goals',
    { description: 'Get active goals: step goals, activity goals, weight goals, and their progress', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_goals', (c) => c.getGoals()),
  );

  server.registerTool(
    'get_earned_badges',
    { description: 'Get all earned badges and achievements', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_earned_badges', (c) => c.getEarnedBadges()),
  );

  server.registerTool(
    'get_workouts',
    { description: 'Get saved workouts/training plans', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_workouts', (c) => c.getWorkouts()),
  );

  server.registerTool(
    'get_workout',
    { description: 'Get a specific workout definition by ID', inputSchema: { user: userEnum, ...getWorkoutSchema.shape } },
    async ({ user, workoutId }) => callWithBreaker(clientPool, user, 'get_workout', (c) => c.getWorkout(workoutId)),
  );

  server.registerTool(
    'get_gear_activities',
    {
      description: 'Get activities associated with a specific gear item (e.g. runs with a specific pair of shoes)',
      inputSchema: { user: userEnum, ...getGearActivitiesSchema.shape },
    },
    async ({ user, gearUuid, start, limit }) =>
      callWithBreaker(clientPool, user, 'get_gear_activities', (c) => c.getGearActivities(gearUuid, start ?? 0, limit ?? 20)),
  );

  server.registerTool(
    'get_gear_defaults',
    { description: 'Get default gear assignments per activity type', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_gear_defaults', (c) => c.getGearDefaults()),
  );
}
