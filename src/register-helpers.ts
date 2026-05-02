/**
 * register-helpers.ts — registerCompactedTool helper.
 *
 * KAREN Phase 2 (2026-05-02):
 *   Per design §10.4 — integrates compact output mode with register*Tools refactor.
 *   Every tool gets `verbose: boolean` optional input (default false).
 *   When verbose=false: upstream payload → compactors[toolName] → compact output.
 *   When verbose=true: upstream payload returned byte-identical.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodRawShape } from 'zod';
import { ClientPool } from './client/client-pool.js';
import type { GarminClient } from './client/garmin.client.js';
import { compactors } from './compactors.js';
import type { ToolName } from './tool-names.js';
import { callWithBreaker } from './tools/tool-helpers.js';

/**
 * registerCompactedTool — wraps server.registerTool with:
 *   1. `verbose` flag appended to every tool's inputSchema
 *   2. circuit-breaker + error-isolation via callWithBreaker
 *   3. compact/raw dispatch based on verbose flag
 *
 * @param server        McpServer instance
 * @param clientPool    ClientPool instance (provides user enum + circuit breaker)
 * @param toolName      Must be a valid ToolName (compile-time checked)
 * @param description   Tool description string
 * @param inputSchema   Zod shape WITHOUT user or verbose (both added here)
 * @param upstreamCall  Async function receiving GarminClient and args, returning raw data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerCompactedTool(
  server: McpServer,
  clientPool: ClientPool,
  toolName: ToolName,
  description: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: ZodRawShape,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upstreamCall: (client: GarminClient, args: any) => Promise<unknown>,
): void {
  const userEnum = z.enum(clientPool.userEnum);

  const fullSchema = {
    user: userEnum,
    ...inputSchema,
    verbose: z.boolean().default(false).optional(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).registerTool(
    toolName,
    { description, inputSchema: fullSchema },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any) => {
      return callWithBreaker(
        clientPool,
        args.user,
        toolName,
        async (client) => {
          const raw = await upstreamCall(client, args);
          const verbose = args.verbose ?? false;
          return verbose ? raw : compactors[toolName](raw);
        },
      );
    },
  );
}
