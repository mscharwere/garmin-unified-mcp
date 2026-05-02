// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { getTrainingPlanSchema, getScheduledWorkoutSchema } from '../dtos';
import { callWithBreaker } from './tool-helpers.js';

export function registerTrainingTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_training_plans',
    { description: 'Get all training plans from Garmin Coach or custom plans', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_training_plans', (c) => c.getTrainingPlans()),
  );

  server.registerTool(
    'get_training_plan_by_id',
    { description: 'Get a specific training plan by ID with full schedule and workout details', inputSchema: { user: userEnum, ...getTrainingPlanSchema.shape } },
    async ({ user, planId }) => callWithBreaker(clientPool, user, 'get_training_plan_by_id', (c) => c.getTrainingPlan(planId)),
  );

  server.registerTool(
    'get_adaptive_training_plan_by_id',
    { description: 'Get an adaptive (Garmin Coach) training plan by ID', inputSchema: { user: userEnum, ...getTrainingPlanSchema.shape } },
    async ({ user, planId }) => callWithBreaker(clientPool, user, 'get_adaptive_training_plan_by_id', (c) => c.getAdaptiveTrainingPlan(planId)),
  );

  server.registerTool(
    'get_scheduled_workout_by_id',
    { description: 'Get a specific scheduled workout by ID from a training plan', inputSchema: { user: userEnum, ...getScheduledWorkoutSchema.shape } },
    async ({ user, workoutId }) => callWithBreaker(clientPool, user, 'get_scheduled_workout_by_id', (c) => c.getScheduledWorkout(workoutId)),
  );
}
