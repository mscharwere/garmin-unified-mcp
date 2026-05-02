/**
 * tool-names.test.ts — KAREN Phase 2 (2026-05-02)
 *
 * Asserts that the hand-maintained TOOL_NAMES union in src/tool-names.ts
 * matches the actual tools registered on a bootstrapped McpServer.
 *
 * Per design §10.1: "A unit test in test/tool-names.test.ts asserts the union
 * matches the actual registered tools at server-init time."
 *
 * This test is the inverse of the compile-time guard:
 *   - Compile-time: Record<ToolName, Compactor> fails if a tool is missing from compactors.
 *   - Runtime: this test fails if a tool is removed from registrars but still in TOOL_NAMES.
 */

import { describe, it, expect } from 'vitest';
import { TOOL_NAMES } from '../src/tool-names.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ClientPool } from '../src/client/client-pool.js';
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
} from '../src/tools/index.js';

/**
 * Build a mock ClientPool sufficient for tool registration without real credentials.
 * We only need userEnum and a stub get() for registration to proceed.
 */
function buildMockPool(): ClientPool {
  // Use a minimal env override — ClientPool parses GARMIN_USERS JSON
  // We mock the entire pool to avoid JSON parse issues in test env.
  const mockPool = {
    userEnum: ['carlos', 'carlitos', 'daniel'] as [string, ...string[]],
    get: () => { throw new Error('mock — no real client'); },
    checkBreaker: () => ({ open: false }),
    isHalfOpen: () => false,
    recordAuthFailure: () => {},
    recordHalfOpenResult: () => {},
  } as unknown as ClientPool;
  return mockPool;
}

/**
 * Bootstrap a McpServer, register all tools, and collect the registered tool names.
 * McpServer exposes registered tools via internal map — we access via the
 * public interface (tool catalog).
 */

/**
 * extractKeys — defensive accessor for McpServer._registeredTools
 *
 * BACKGROUND: We need to verify our static `ToolName` union covers every
 * tool actually registered at runtime. The MCP SDK exposes registered
 * tools via `McpServer._registeredTools` — note the leading underscore
 * (private API).
 *
 * SDK QUIRK: As of @modelcontextprotocol/sdk v1.12.1 (pinned range ^1.12.1),
 * this field is a plain JS Object (record-style), not an ES6 Map. On the SDK
 * side, this could change to Map (or be renamed/removed entirely) without
 * SemVer ceremony — it's marked private.
 *
 * THIS HELPER: handles both shapes safely. If `_registeredTools` is
 * a Map, returns Array.from(map.keys()). If it's an Object, returns
 * Object.keys(). If it's missing or some other shape, throws clearly.
 *
 * ON SDK BUMP — verify:
 *   1. Does `_registeredTools` still exist on McpServer instances?
 *   2. Is the shape still Object or Map (this helper handles both)?
 *   3. If gone or unrecognized: search for a PUBLIC SDK API to enumerate
 *      registered tools. If one exists, migrate to it (delete this helper).
 *      Likely candidates: server.listTools(), server.toolNames, or similar.
 *
 * See FORK_PATCH.md "SDK Private API Dependency" for full context.
 */
/**
 * extractKeys — defensive accessor for McpServer._registeredTools
 *
 * Returns null if the property is absent (falsy) — caller tries other candidate props.
 * Returns string[] if the shape is Map or plain Object.
 * Throws if the property exists but is an unrecognized non-null shape — CI must catch this.
 *
 * See FORK_PATCH.md "SDK Private API Dependency" for the upgrade procedure.
 */
function extractKeys(obj: unknown): string[] | null {
  if (obj == null) return null; // absent — try next candidate
  if (obj instanceof Map) return Array.from(obj.keys());
  if (typeof obj === 'object') return Object.keys(obj as object);
  throw new Error(
    `extractKeys: _registeredTools exists but has unrecognized shape (got ${typeof obj}). ` +
    'See FORK_PATCH.md "SDK Private API Dependency" for the upgrade procedure.',
  );
}

function collectRegisteredToolNames(): string[] {
  // McpServer with dummy server info — we never connect it to a transport
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const pool = buildMockPool();

  registerActivityTools(server, pool);
  registerHealthTools(server, pool);
  registerTrendTools(server, pool);
  registerSleepTools(server, pool);
  registerBodyTools(server, pool);
  registerPerformanceTools(server, pool);
  registerProfileTools(server, pool);
  registerRangeTools(server, pool);
  registerSnapshotTools(server, pool);
  registerTrainingTools(server, pool);
  registerWellnessTools(server, pool);
  registerChallengeTools(server, pool);
  registerWriteTools(server, pool);

  // McpServer stores registered tools in _registeredTools (internal).
  // The SDK may use a Map or a plain Object depending on version.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = server as any;

  // Try McpServer-level properties first (most likely location)
  for (const prop of ['_registeredTools', '_tools', 'registeredTools']) {
    const keys = extractKeys(s[prop]);
    if (keys !== null && keys.length > 0) return keys;
  }

  // Try inner _server / server property (Server base class)
  const inner = s._server ?? s.server;
  if (inner) {
    for (const prop of ['_registeredTools', '_tools', 'registeredTools']) {
      const keys = extractKeys(inner[prop]);
      if (keys !== null && keys.length > 0) return keys;
    }
  }

  // No known property yielded tool names — SDK internals are gone.
  // Throw loudly so CI catches the regression instead of silently passing.
  throw new Error(
    'collectRegisteredToolNames: _registeredTools (and all fallback props) are absent on ' +
    'this McpServer instance. The SDK private API has been removed or renamed. ' +
    'See FORK_PATCH.md "SDK Private API Dependency" for the upgrade procedure.',
  );
}

describe('tool-names.ts', () => {
  it('TOOL_NAMES has 97 entries', () => {
    expect(TOOL_NAMES.length).toBe(97);
  });

  it('TOOL_NAMES has no duplicates', () => {
    const unique = new Set(TOOL_NAMES);
    expect(unique.size).toBe(TOOL_NAMES.length);
  });

  it('ToolName union matches registered tools exactly', () => {
    // collectRegisteredToolNames throws if SDK private API is gone — CI catches the regression.
    const registered = collectRegisteredToolNames();

    const registeredSet = new Set(registered);
    const declaredSet = new Set(TOOL_NAMES);

    // Tools in TOOL_NAMES but not registered
    const missing = [...declaredSet].filter((n) => !registeredSet.has(n));
    // Tools registered but not in TOOL_NAMES
    const extra = [...registeredSet].filter((n) => !declaredSet.has(n));

    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });
});
