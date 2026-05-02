// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
// All write tools use identity compactor (small ack payloads).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
import { registerCompactedTool } from '../register-helpers.js';

export function registerWriteTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'set_activity_name',
    'Rename an activity',
    setActivityNameSchema.shape,
    (c, { activityId, name }) => c.setActivityName(activityId, name),
  );

  registerCompactedTool(
    server, clientPool, 'create_manual_activity',
    'Create a manual activity entry. Use get_activity_types to find valid activityTypeKey values',
    createManualActivitySchema.shape,
    (c, { activityName, activityTypeKey, startTimeInGMT, elapsedDurationInSecs, distanceInMeters }) =>
      c.createManualActivity({ activityName, activityTypeKey, startTimeInGMT, elapsedDurationInSecs, distanceInMeters }),
  );

  registerCompactedTool(
    server, clientPool, 'delete_activity',
    'Delete an activity permanently. This action cannot be undone',
    deleteActivitySchema.shape,
    (c, { activityId }) => c.deleteActivity(activityId),
  );

  registerCompactedTool(
    server, clientPool, 'add_weigh_in',
    'Record a weight measurement',
    addWeighInSchema.shape,
    (c, { weight, unitKey, date }) => c.addWeighIn(weight, unitKey ?? 'kg', date),
  );

  registerCompactedTool(
    server, clientPool, 'set_hydration',
    'Set daily hydration intake in milliliters',
    setHydrationSchema.shape,
    (c, { valueMl, date }) => c.setHydration(valueMl, date),
  );

  registerCompactedTool(
    server, clientPool, 'set_blood_pressure',
    'Record a blood pressure measurement with systolic, diastolic, and pulse',
    setBloodPressureSchema.shape,
    (c, { systolic, diastolic, pulse, timestamp, notes }) => c.setBloodPressure(systolic, diastolic, pulse, timestamp, notes),
  );

  registerCompactedTool(
    server, clientPool, 'add_gear_to_activity',
    'Link a gear item (shoes, bike) to an activity',
    gearActivitySchema.shape,
    (c, { gearUuid, activityId }) => c.addGearToActivity(gearUuid, activityId),
  );

  registerCompactedTool(
    server, clientPool, 'remove_gear_from_activity',
    'Unlink a gear item from an activity',
    gearActivitySchema.shape,
    (c, { gearUuid, activityId }) => c.removeGearFromActivity(gearUuid, activityId),
  );
}
