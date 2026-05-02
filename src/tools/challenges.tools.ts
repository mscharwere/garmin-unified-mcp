// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { callWithBreaker } from './tool-helpers.js';

export function registerChallengeTools(server: McpServer, clientPool: ClientPool): void {
  const userEnum = z.enum(clientPool.userEnum);

  server.registerTool(
    'get_available_badges',
    { description: 'Get all available badges that can be earned', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_available_badges', (c) => c.getAvailableBadges()),
  );

  server.registerTool(
    'get_adhoc_challenges',
    { description: 'Get historical ad-hoc challenges the user has participated in', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_adhoc_challenges', (c) => c.getAdhocChallenges()),
  );

  server.registerTool(
    'get_badge_challenges',
    { description: 'Get completed badge challenges', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_badge_challenges', (c) => c.getBadgeChallenges()),
  );

  server.registerTool(
    'get_available_badge_challenges',
    { description: 'Get available badge challenges that can be joined', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_available_badge_challenges', (c) => c.getAvailableBadgeChallenges()),
  );

  server.registerTool(
    'get_non_completed_badge_challenges',
    { description: 'Get badge challenges that are started but not yet completed', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_non_completed_badge_challenges', (c) => c.getNonCompletedBadgeChallenges()),
  );

  server.registerTool(
    'get_inprogress_virtual_challenges',
    { description: 'Get virtual challenges currently in progress', inputSchema: { user: userEnum } },
    async ({ user }) => callWithBreaker(clientPool, user, 'get_inprogress_virtual_challenges', (c) => c.getInProgressVirtualChallenges()),
  );
}
