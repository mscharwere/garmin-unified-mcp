// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { getTrainingPlanSchema, getScheduledWorkoutSchema } from '../dtos';
import { registerCompactedTool } from '../register-helpers.js';

export function registerTrainingTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(server, clientPool, 'get_training_plans', 'Get all training plans from Garmin Coach or custom plans', {}, (c) => c.getTrainingPlans());

  registerCompactedTool(
    server, clientPool, 'get_training_plan_by_id',
    'Get a specific training plan by ID with full schedule and workout details',
    getTrainingPlanSchema.shape,
    (c, { planId }) => c.getTrainingPlan(planId),
  );

  registerCompactedTool(
    server, clientPool, 'get_adaptive_training_plan_by_id',
    'Get an adaptive (Garmin Coach) training plan by ID',
    getTrainingPlanSchema.shape,
    (c, { planId }) => c.getAdaptiveTrainingPlan(planId),
  );

  registerCompactedTool(
    server, clientPool, 'get_scheduled_workout_by_id',
    'Get a specific scheduled workout by ID from a training plan',
    getScheduledWorkoutSchema.shape,
    (c, { workoutId }) => c.getScheduledWorkout(workoutId),
  );
}
