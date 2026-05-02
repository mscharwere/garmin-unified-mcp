// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import {
  setActivityNameSchema,
  createManualActivitySchema,
  deleteActivitySchema,
  addWeighInSchema,
  setHydrationSchema,
  setBloodPressureSchema,
  gearActivitySchema,
} from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerWriteTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'set_activity_name',
    { description: 'Rename an activity', inputSchema: { user: userEnum, ...setActivityNameSchema.shape } },
    async ({ user, activityId, name }) => callWithBreaker(clientPool, user, 'set_activity_name', (c) => c.setActivityName(activityId, name)),
  );

  server.registerTool(
    'create_manual_activity',
    {
      description: 'Create a manual activity entry. Use get_activity_types to find valid activityTypeKey values',
      inputSchema: { user: userEnum, ...createManualActivitySchema.shape },
    },
    async ({ user, activityName, activityTypeKey, startTimeInGMT, elapsedDurationInSecs, distanceInMeters }) =>
      callWithBreaker(clientPool, user, 'create_manual_activity', (c) =>
        c.createManualActivity({ activityName, activityTypeKey, startTimeInGMT, elapsedDurationInSecs, distanceInMeters }),
      ),
  );

  server.registerTool(
    'delete_activity',
    { description: 'Delete an activity permanently. This action cannot be undone', inputSchema: { user: userEnum, ...deleteActivitySchema.shape } },
    async ({ user, activityId }) => callWithBreaker(clientPool, user, 'delete_activity', (c) => c.deleteActivity(activityId)),
  );

  server.registerTool(
    'add_weigh_in',
    { description: 'Record a weight measurement', inputSchema: { user: userEnum, ...addWeighInSchema.shape } },
    async ({ user, weight, unitKey, date }) => callWithBreaker(clientPool, user, 'add_weigh_in', (c) => c.addWeighIn(weight, unitKey ?? 'kg', date)),
  );

  server.registerTool(
    'set_hydration',
    { description: 'Set daily hydration intake in milliliters', inputSchema: { user: userEnum, ...setHydrationSchema.shape } },
    async ({ user, valueMl, date }) => callWithBreaker(clientPool, user, 'set_hydration', (c) => c.setHydration(valueMl, date)),
  );

  server.registerTool(
    'set_blood_pressure',
    { description: 'Record a blood pressure measurement with systolic, diastolic, and pulse', inputSchema: { user: userEnum, ...setBloodPressureSchema.shape } },
    async ({ user, systolic, diastolic, pulse, timestamp, notes }) =>
      callWithBreaker(clientPool, user, 'set_blood_pressure', (c) => c.setBloodPressure(systolic, diastolic, pulse, timestamp, notes)),
  );

  server.registerTool(
    'add_gear_to_activity',
    { description: 'Link a gear item (shoes, bike) to an activity', inputSchema: { user: userEnum, ...gearActivitySchema.shape } },
    async ({ user, gearUuid, activityId }) => callWithBreaker(clientPool, user, 'add_gear_to_activity', (c) => c.addGearToActivity(gearUuid, activityId)),
  );

  server.registerTool(
    'remove_gear_from_activity',
    { description: 'Unlink a gear item from an activity', inputSchema: { user: userEnum, ...gearActivitySchema.shape } },
    async ({ user, gearUuid, activityId }) => callWithBreaker(clientPool, user, 'remove_gear_from_activity', (c) => c.removeGearFromActivity(gearUuid, activityId)),
  );
}
