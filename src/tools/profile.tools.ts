// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import {
  getDeviceSettingsSchema,
  getDeviceSolarSchema,
  getGearStatsSchema,
  getGearActivitiesSchema,
  getWorkoutSchema,
} from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerProfileTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(server, clientPool, 'get_user_profile', 'Get user social profile: name, location, profile image, activity preferences, level', {}, (c) => c.getUserProfile());
  registerCompactedTool(server, clientPool, 'get_user_settings', 'Get user settings: measurement system, time/date format, sleep schedule, HR zones, hydration preferences', {}, (c) => c.getUserSettings());
  registerCompactedTool(server, clientPool, 'get_devices', 'Get all registered Garmin devices: model, firmware, last sync', {}, (c) => c.getDevices());

  registerCompactedTool(
    server, clientPool, 'get_device_settings',
    'Get settings and configuration for a specific Garmin device',
    getDeviceSettingsSchema.shape,
    (c, { deviceId }) => c.getDeviceSettings(deviceId),
  );

  registerCompactedTool(server, clientPool, 'get_device_last_used', 'Get the last used Garmin device info', {}, (c) => c.getDeviceLastUsed());
  registerCompactedTool(server, clientPool, 'get_primary_training_device', 'Get the primary training device info', {}, (c) => c.getPrimaryTrainingDevice());

  registerCompactedTool(
    server, clientPool, 'get_device_solar_data',
    'Get solar charging data for solar-equipped Garmin devices',
    getDeviceSolarSchema.shape,
    (c, { deviceId, startDate, endDate }) => c.getDeviceSolarData(deviceId, startDate, endDate),
  );

  registerCompactedTool(server, clientPool, 'get_gear', 'Get all gear/equipment: shoes, bikes, and other tracked equipment', {}, (c) => c.getGear());

  registerCompactedTool(
    server, clientPool, 'get_gear_stats',
    'Get usage statistics for a specific gear item (total distance, activities)',
    getGearStatsSchema.shape,
    (c, { gearUuid }) => c.getGearStats(gearUuid),
  );

  registerCompactedTool(server, clientPool, 'get_goals', 'Get active goals: step goals, activity goals, weight goals, and their progress', {}, (c) => c.getGoals());
  registerCompactedTool(server, clientPool, 'get_earned_badges', 'Get all earned badges and achievements', {}, (c) => c.getEarnedBadges());
  registerCompactedTool(server, clientPool, 'get_workouts', 'Get saved workouts/training plans', {}, (c) => c.getWorkouts());

  registerCompactedTool(
    server, clientPool, 'get_workout',
    'Get a specific workout definition by ID',
    getWorkoutSchema.shape,
    (c, { workoutId }) => c.getWorkout(workoutId),
  );

  registerCompactedTool(
    server, clientPool, 'get_gear_activities',
    'Get activities associated with a specific gear item (e.g. runs with a specific pair of shoes)',
    getGearActivitiesSchema.shape,
    (c, { gearUuid, start, limit }) => c.getGearActivities(gearUuid, start ?? 0, limit ?? 20),
  );

  registerCompactedTool(server, clientPool, 'get_gear_defaults', 'Get default gear assignments per activity type', {}, (c) => c.getGearDefaults());
}
