// KAREN Phase 1 (2026-05-02): Garmin Unified MCP bootstrap.
// Replaces single GarminClient with ClientPool — all users served from one process.
// Server name: garmin-unified-mcp v1.0.0
// See: C:/Jarvis/Team/TARS/garmin_unified_mcp_design.md (§2, §3, §4)

// TARS 2026-05-07: Load credentials from .env BEFORE any module-level code
// references process.env.GARMIN_*. dotenv.config() is the FIRST executable
// statement so the ClientPool sees populated env vars at construction time.
// .env lives in the repo root (gitignored) and supplies GARMIN_USERS +
// GARMIN_TOKEN_ROOT — see .env.example for the contract.
import dotenv from 'dotenv';
dotenv.config();

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildClientPool } from './client/client-pool.js';
import {
  registerActivityTools,
  registerHealthTools,
  registerTrendTools,
  registerSleepTools,
  registerBodyTools,
  registerPerformanceTools,
  registerProfileTools,
  registerRangeTools,
  registerSnapshotTools,
  registerTrainingTools,
  registerWellnessTools,
  registerChallengeTools,
  registerWriteTools,
} from './tools';

// Build client pool from GARMIN_USERS + GARMIN_TOKEN_ROOT env vars.
// Exits with a descriptive error if config is missing or malformed.
let clientPool: ReturnType<typeof buildClientPool>;
try {
  clientPool = buildClientPool();
} catch (err) {
  console.error(
    'Error: Failed to initialize Garmin client pool.\n' +
    (err instanceof Error ? err.message : String(err)) + '\n\n' +
    'Required env vars:\n' +
    '  GARMIN_USERS  — JSON array: [{"id":"carlos","email":"...","password":"..."},{"id":"carlitos",...},{"id":"daniel",...}]\n' +
    '  GARMIN_TOKEN_ROOT — base directory for per-user token caches (e.g. C:\\Users\\mscha\\.garmin-mcp-unified)\n' +
    '    Per-user token dirs: ${GARMIN_TOKEN_ROOT}/${userId}/',
  );
  process.exit(1);
}

// Bump server name + version per design §4 requirement.
const server = new McpServer({
  name: 'garmin-unified-mcp',
  version: '1.0.0',
});

// Register all 13 tool groups with clientPool instead of a single client.
// Each tool gets a `user` Zod enum param as the first argument.
registerActivityTools(server, clientPool);
registerHealthTools(server, clientPool);
registerTrendTools(server, clientPool);
registerSleepTools(server, clientPool);
registerBodyTools(server, clientPool);
registerPerformanceTools(server, clientPool);
registerProfileTools(server, clientPool);
registerRangeTools(server, clientPool);
registerSnapshotTools(server, clientPool);
registerTrainingTools(server, clientPool);
registerWellnessTools(server, clientPool);
registerChallengeTools(server, clientPool);
registerWriteTools(server, clientPool);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `garmin-unified-mcp v1.0.0 running on stdio — ${clientPool.userIds.length} user(s): ${clientPool.userIds.join(', ')}`,
  );
}

main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
