# FORK_PATCH.md — garmin-unified-mcp

Documents every modification from upstream `Nicolasvegam/garmin-connect-mcp` for upstream rebase resilience.
Per design spec §8 Risk 3 mitigation.

**Upstream base:** `Nicolasvegam/garmin-connect-mcp` @ v1.1.0 (commit at fork time: 2026-05-02)
**Fork:** `mscharwere/garmin-unified-mcp`
**Phase 1 changes authored:** KAREN, 2026-05-02
**Phase 2 changes authored:** KAREN, 2026-05-02
**Design doc:** `C:/Jarvis/Team/TARS/garmin_unified_mcp_design.md`

---

## Files Modified (upstream-present files changed)

### `src/client/garmin-auth.ts` — CORE AUTH CLASS (most rebase-fragile)

**Change type:** Constructor signature change + module-scope constant removal + per-instance field.

**Specific edits:**
- Line 31 (upstream): `const TOKEN_DIR = process.env.GARMIN_TOKEN_DIR || path.join(os.homedir(), '.garmin-mcp');`
  → Replaced with `const DEFAULT_TOKEN_DIR = path.join(os.homedir(), '.garmin-mcp');`
  → `process.env.GARMIN_TOKEN_DIR` env var no longer used; `tokenDir` comes from constructor.
- Class `GarminAuth` — added private field: `private readonly tokenDir: string;`
- Constructor signature: `constructor(email, password, promptMfa?)` → `constructor(email, password, tokenDir?, promptMfa?)`
  - `tokenDir` is the 3rd positional parameter (between password and promptMfa)
  - `this.tokenDir = tokenDir ?? DEFAULT_TOKEN_DIR;`
- `loadTokens()`: all 3 `path.join(TOKEN_DIR, ...)` calls → `path.join(this.tokenDir, ...)`
- `saveTokens()`: `TOKEN_DIR` directory existence check + 3 `path.join(TOKEN_DIR, ...)` calls → `this.tokenDir`

**Why fragile:** If upstream refactors `GarminAuth` constructor (adds parameters, changes order, changes `loadTokens`/`saveTokens` signatures), this diff will conflict.
**Rebase budget:** ~15 minutes focused re-application.

---

### `src/client/garmin.client.ts` — CLIENT CONSTRUCTOR PASSTHROUGH

**Change type:** Constructor signature change to thread `tokenDir` to `GarminAuth`.

**Specific edits:**
- Constructor: `constructor(email, password, promptMfa?)` → `constructor(email, password, tokenDir?, promptMfa?)`
- `new GarminAuth(email, password, promptMfa)` → `new GarminAuth(email, password, tokenDir, promptMfa)`

**Why fragile:** Conflicts if upstream modifies `GarminClient` constructor.
**Rebase budget:** ~5 minutes.

---

### `src/index.ts` — BOOTSTRAP ENTRYPOINT (full rewrite)

**Change type:** Complete replacement of single-user bootstrap with multi-user ClientPool bootstrap.

**Before:** Reads `GARMIN_EMAIL` + `GARMIN_PASSWORD`, instantiates one `GarminClient`, passes it to all 13 `register*Tools` calls.
**After:** Reads `GARMIN_USERS` + `GARMIN_TOKEN_ROOT`, builds `ClientPool` via `buildClientPool()`, passes `clientPool` to all 13 `register*Tools` calls.

**Specific edits:**
- Import: removed `GarminClient` import; added `buildClientPool` from `./client/client-pool.js`
- Server name: `'garmin-connect-mcp'` → `'garmin-unified-mcp'`
- Server version: `'1.0.0'` stays same (this is our version, not upstream's)
- All 13 `register*Tools(server, client)` → `register*Tools(server, clientPool)`
- Startup log updated to list user count and user ids

**Why fragile:** Low conflict risk — this is additive at the call sites. But if upstream adds new `register*Tools` imports, the merge requires adding a `clientPool`-based call for the new registrar.
**Rebase budget:** ~10 minutes (primarily adding new registrar calls for any upstream-added tool categories).

---

### `src/tools/activities.tools.ts` — REGISTRAR REFACTOR

**Change type:** Function signature change + per-tool `user` param injection + error wrapping.

**Before:** `registerActivityTools(server: McpServer, client: GarminClient): void`
**After:** `registerActivityTools(server: McpServer, clientPool: ClientPool): void`

**Structural changes (applies to ALL 13 registrar files — see below):**
- Import: `GarminClient` → `ClientPool` (type import) + `callWithBreaker` helper + `z` (Zod)
- Function parameter: `client: GarminClient` → `clientPool: ClientPool`
- Added: `const userEnum = z.enum(clientPool.userEnum);` at top of function body
- Each `server.registerTool(name, { inputSchema: existingSchema.shape }, async (args) => { ... })` →
  `server.registerTool(name, { inputSchema: { user: userEnum, ...existingSchema.shape } }, async ({ user, ...args }) => callWithBreaker(clientPool, user, name, (c) => c.method(...)))`
- Tools with no `inputSchema` (no-arg tools): `inputSchema` added as `{ user: userEnum }`

**Why fragile:** If upstream restructures a registrar (adds tools, changes method names, changes DTO schemas), re-application requires matching each new tool registration pattern.
**Rebase budget:** 5–10 minutes per registrar with upstream changes. 13 registrars total.

---

### `src/tools/body.tools.ts` — See activities.tools.ts pattern above

### `src/tools/challenges.tools.ts` — See activities.tools.ts pattern above

### `src/tools/health.tools.ts` — See activities.tools.ts pattern above

### `src/tools/performance.tools.ts` — See activities.tools.ts pattern above

### `src/tools/profile.tools.ts` — See activities.tools.ts pattern above

### `src/tools/range.tools.ts` — See activities.tools.ts pattern above

### `src/tools/sleep.tools.ts` — See activities.tools.ts pattern above

### `src/tools/snapshot.tools.ts` — See activities.tools.ts pattern above

### `src/tools/training.tools.ts` — See activities.tools.ts pattern above

### `src/tools/trends.tools.ts` — See activities.tools.ts pattern above

### `src/tools/wellness.tools.ts` — See activities.tools.ts pattern above

### `src/tools/write.tools.ts` — See activities.tools.ts pattern above

---

### `src/client/index.ts` — EXPORTS

**Change type:** Added exports for ClientPool, buildClientPool, UserConfig.

**Specific edits (additive only):**
```ts
export { ClientPool, buildClientPool } from './client-pool';
export type { UserConfig } from './client-pool';
```

**Why fragile:** Very low risk — additive export. Conflicts only if upstream adds the same export names.

---

### `package.json` — NAME + VERSION

**Change type:** Name and description updated.

- `name`: `@nicolasvegam/garmin-connect-mcp` → `@mscharwere/garmin-unified-mcp`
- `version`: `1.1.0` → `1.0.0` (our fork's versioning starts at 1.0.0)
- `description`: updated to reflect multi-user unified nature

**Rebase note:** On upstream version bump, do NOT adopt upstream version. Keep our fork at `1.x.x` independently.

---

### `README.md` — DOCUMENTATION

**Change type:** Full replacement with unified-MCP docs.

**Content added:**
- Configuration: `GARMIN_USERS` + `GARMIN_TOKEN_ROOT` env vars
- MFA Recovery Procedure (verbatim per ARIIA non-negotiable #6 + §3)
- Disaster Recovery Runbook (per GERTY ask #2 + §8)
- Fork maintenance cadence

**Rebase note:** Take upstream's README changes selectively (new tool categories, endpoint additions). Do not adopt upstream's single-user configuration docs.

---

## Phase 2 Changes (Compact Output Mode — 2026-05-02)

All Phase 2 files are new additions with zero upstream conflict risk.

### `src/client/garmin.client.ts` — NIT 1 FIX (Phase 2 addition to Phase 1 file)

**Change type:** Added two thin alias methods at end of class body.

**Specific edits:**
- Added `getSteps(date?)` → calls `getDailySummary(date)` (alias for test compatibility)
- Added `getLatestWeight()` → calls `getDailyWeighIns()` (alias for test compatibility)

**Why:** `garmin.client.test.ts` (live-API integration test) uses these method names. Without the aliases, the TS compiler reports `Property 'getSteps' does not exist on type 'GarminClient'`.

---

### `src/tools/activities.tools.ts` (and all 13 registrars) — Phase 2 refactor

**Change type:** Each registrar now imports and calls `registerCompactedTool` from `../register-helpers.js` instead of calling `server.registerTool` directly.

**Before (Phase 1):** Each tool registered with `server.registerTool(name, schema, handler)` where handler calls `callWithBreaker(...)`.
**After (Phase 2):** Each tool registered with `registerCompactedTool(server, pool, name, description, inputSchema, upstreamCall)`.

**Net effect:** Every registered tool gains a `verbose: boolean` (default `false`) parameter automatically. `false` returns compact output; `true` returns raw upstream JSON byte-identical.

**Rebase note:** Same fragility as Phase 1 — if upstream adds new tools to a registrar, re-apply the `registerCompactedTool` pattern for the new tool.

---

### `package.json` — TEST SCRIPTS

**Change type:** Added two scripts.
```json
"test": "vitest run",
"test:watch": "vitest"
```

---

## Files Added (new — no upstream conflict possible)

### `src/tool-names.ts` — NEW (Phase 2)

**Purpose:** Hand-maintained `TOOL_NAMES` string-literal tuple (97 entries) and `ToolName` union type. Required by `Record<ToolName, Compactor>` exhaustive type in `compactors.ts`. Organized by registrar file for readability.

**Conflict risk:** Zero (new file). On upstream rebase, any new tools added upstream must be added here and to `compactors.ts`.

---

### `src/compactors.ts` — NEW (Phase 2)

**Purpose:** Exhaustive `compactors: Record<ToolName, Compactor>` map — one entry per tool. ~72 non-identity compactors with field projections; ~25 identity passthroughs (write tools, device tools, gear tools, raw endpoints).

**Key design:** `Record<ToolName, Compactor>` is a TS compile error if any `ToolName` entry is missing from the record. Adding a new tool to a registrar without adding a compactor entry fails the build.

**Conflict risk:** Zero (new file). On upstream rebase, add identity compactor entry for any new upstream tools.

---

### `src/register-helpers.ts` — NEW (Phase 2)

**Purpose:** `registerCompactedTool()` helper — wraps `server.registerTool`, appends `verbose: boolean` (default `false`) to every tool's schema, calls `callWithBreaker` internally, dispatches to `compactors[toolName](raw)` when `verbose=false` or returns raw payload when `verbose=true`.

**Conflict risk:** Zero (new file).

---

### `vitest.config.ts` — NEW (Phase 2)

**Purpose:** vitest configuration — includes `tests/**/*.test.ts`, excludes live-API integration test (`garmin.client.test.ts`).

**Conflict risk:** Zero (new file).

---

### `tests/` directory — NEW (Phase 2)

| File | Purpose |
|------|---------|
| `tests/compactors.test.ts` | 49 tests: byte-ratio CI gates (≤5% sleep, ≤20% activity, ≤10% activity_details, ≤70% general), shape assertions, snapshot tests, identity compactor verification, BAYMAX 8K + COLOSSUS 4K token budget tests, verbose=true round-trip |
| `tests/tool-names.test.ts` | 3 tests: TOOL_NAMES has 97 entries, no duplicates, matches registered tools exactly |
| `tests/fixtures/get_sleep_data.full.json` | ~128KB realistic sleep payload (450 per-minute samples per time series) |
| `tests/fixtures/get_activity.cardio.full.json` | ~6KB activity fixture with 9-lap splits (running) |
| `tests/fixtures/get_activity.team-sport.full.json` | ~4KB activity fixture with 6-interval splits (soccer) |
| `tests/fixtures/get_activity_details.cardio.full.json` | ~260KB per-second metrics fixture (2840 samples, 6 metric channels) |
| `tests/fixtures/get_activity_details.team-sport.full.json` | ~310KB per-second metrics fixture (3480 samples, 4 metric channels) |
| `tests/snapshots/` | Vitest snapshot files (auto-generated) |

---

## Files Added (new — no upstream conflict possible)

### `src/client/client-pool.ts` — NEW

**Purpose:** `ClientPool` class — parses `GARMIN_USERS` JSON, instantiates one `GarminClient` per user with per-user `tokenDir`, manages per-user circuit breakers.
**Conflict risk:** Zero (new file). On upstream rebase, always additive.

### `src/tools/tool-helpers.ts` — NEW

**Purpose:** `callWithBreaker()` helper — circuit-breaker check, per-tool try/catch, MFA error detection, structured MCP error responses.
**Conflict risk:** Zero (new file).

### `FORK_PATCH.md` — THIS FILE

**Purpose:** Upstream rebase resilience documentation (§8 Risk 3 mitigation).
**Conflict risk:** Zero (new file).

---

## Upstream Sync Protocol

On monthly upstream sync:

1. `git fetch upstream && git rebase upstream/main`
2. **Start with `garmin-auth.ts`** (most fragile) — re-apply `tokenDir` constructor parameter first
3. Apply `garmin.client.ts` constructor passthrough
4. Apply `index.ts` bootstrap changes (verify all registrar calls use `clientPool`)
5. Apply 13 registrar refactors (mechanical — search for any new `register*Tools(server, client)` → `register*Tools(server, clientPool)`)
6. Check for new tool registrar files (new categories) — add clientPool passthrough
7. Run `npm run build` — fix any type errors
8. Budget: 30–60 min for a clean upstream diff; half a day if upstream refactored auth

Tag sync commits: `[upstream-sync] Sync with upstream v1.x.x`
