// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientPool } from '../client/client-pool.js';
import { registerCompactedTool } from '../register-helpers.js';

export function registerChallengeTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(server, clientPool, 'get_available_badges', 'Get all available badges that can be earned', {}, (c) => c.getAvailableBadges());
  registerCompactedTool(server, clientPool, 'get_adhoc_challenges', 'Get historical ad-hoc challenges the user has participated in', {}, (c) => c.getAdhocChallenges());
  registerCompactedTool(server, clientPool, 'get_badge_challenges', 'Get completed badge challenges', {}, (c) => c.getBadgeChallenges());
  registerCompactedTool(server, clientPool, 'get_available_badge_challenges', 'Get available badge challenges that can be joined', {}, (c) => c.getAvailableBadgeChallenges());
  registerCompactedTool(server, clientPool, 'get_non_completed_badge_challenges', 'Get badge challenges that are started but not yet completed', {}, (c) => c.getNonCompletedBadgeChallenges());
  registerCompactedTool(server, clientPool, 'get_inprogress_virtual_challenges', 'Get virtual challenges currently in progress', {}, (c) => c.getInProgressVirtualChallenges());
}
