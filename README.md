# garmin-unified-mcp

**Fork of [Nicolasvegam/garmin-connect-mcp](https://github.com/Nicolasvegam/garmin-connect-mcp) — multi-user unified server.**

Single MCP process serving multiple Garmin accounts via a `GARMIN_USERS` credential pool. Each tool gains a required `user` enum parameter; token directories are isolated per user. Replaces the previous pattern of 3 separate MCP processes.

Architecture design: `C:/Jarvis/Team/TARS/garmin_unified_mcp_design.md`

**97 tools** (16 activities, 14 health, 4 trends, 2 sleep, 7 range, 5 body, 1 snapshot, 4 training, 11 performance, 15 profile, 4 wellness, 6 challenges, 8 write)

---

## Requirements

- Node.js 20+
- Garmin Connect accounts (email + password per user)
- MFA must be disabled on all accounts (see MFA Recovery below)

## Configuration

### Environment variables

```jsonc
// In .mcp.json
"garmin": {
  "command": "node",
  "args": ["C:\\repos\\garmin-unified-mcp\\build\\index.js"],
  "env": {
    "GARMIN_USERS": "[{\"id\":\"carlos\",\"email\":\"carlos@example.com\",\"password\":\"...\"},{\"id\":\"carlitos\",\"email\":\"carlitos@example.com\",\"password\":\"...\"},{\"id\":\"daniel\",\"email\":\"daniel@example.com\",\"password\":\"...\"}]",
    "GARMIN_TOKEN_ROOT": "C:\\Users\\mscha\\.garmin-mcp-unified"
  }
}
```

- `GARMIN_USERS` — JSON array of `{id, email, password}` objects. Each `id` becomes a valid `user` enum value in every tool.
- `GARMIN_TOKEN_ROOT` — Base directory. Per-user token caches stored at `${GARMIN_TOKEN_ROOT}/${userId}/`.

### Tool usage

Every tool now requires a `user` argument:

```
# Before (3 separate servers)
mcp__garmin__get_sleep_data(date: "2026-05-02")
mcp__garmin-carlitos__get_sleep_data(date: "2026-05-02")

# After (1 unified server)
mcp__garmin__get_sleep_data(user: "carlos", date: "2026-05-02")
mcp__garmin__get_sleep_data(user: "carlitos", date: "2026-05-02")
```

## Building

```bash
npm install
npm run build
# Output: build/index.js
```

---

## MFA Recovery

**If a Garmin account in this MCP starts failing with `MFA REQUIRED for user 'X'`, the recovery path is:**

1. Sign into https://www.garmin.com/account/security with that user's credentials in a browser
2. Disable MFA (TOTP / authenticator-app / SMS — whichever was turned on)
3. Confirm via a fresh login that no MFA challenge appears
4. Restart Claude Code (or call any tool for that user; lazy auth will re-prompt SSO)
5. The token cache at `${GARMIN_TOKEN_ROOT}/${userId}/` will be repopulated automatically

If MFA cannot be disabled (account policy, parental control), the user is permanently blocked from this MCP. v1.1 roadmap adds a `garmin_authenticate(code)` tool to support this case — currently upstream-contribution territory.

**This MCP cannot complete login flows that require an MFA code.** The underlying auth library has no MFA flow.

---

## Disaster Recovery Runbook

### Scenario: build/index.js missing or corrupted

```bash
cd C:/repos/garmin-unified-mcp
git pull
npm install
npm run build
# Verify: build/index.js exists
```

### Scenario: all token caches wiped (Garmin SSO re-auth needed)

Token caches at `${GARMIN_TOKEN_ROOT}/${userId}/` auto-repopulate on the first tool call after restart. If SSO rate-limits trigger (3 rapid logins from same IP):
- Stagger first-use calls across users by 2+ seconds between dispatches
- Each user's first call triggers SSO; subsequent calls use cached OAuth2 token

### Scenario: rollback to 3-MCP setup

The original per-user MCP directories must still exist (keep for 1 week post-cutover):
- `C:\Users\mscha\.garmin-mcp` (carlos)
- `C:\Users\mscha\.garmin-mcp-carlitos` (carlitos)
- `C:\Users\mscha\.garmin-mcp-daniel` (daniel)

**Rollback steps:**
1. Revert `C:/Jarvis/.mcp.json` to the 3-entry config (kept commented for rollback window)
2. Restart Claude Code
3. Verify `mcp__garmin__get_user_profile()` returns Carlos's profile from untouched cache

**Note:** The token-cache copy in `${GARMIN_TOKEN_ROOT}/${userId}/` is a copy — originals remain untouched. Deletion of originals is one-way. Do not delete until rollback window expires (1 week minimum from cutover AND after BAYMAX morning + COLOSSUS post-game flows confirmed working with new MCP).

### Scenario: `.mcp.json` env shape reference

```jsonc
{
  "garmin": {
    "command": "node",
    "args": ["C:\\repos\\garmin-unified-mcp\\build\\index.js"],
    "env": {
      "GARMIN_USERS": "[{\"id\":\"carlos\",\"email\":\"...\",\"password\":\"...\"},{\"id\":\"carlitos\",\"email\":\"...\",\"password\":\"...\"},{\"id\":\"daniel\",\"email\":\"...\",\"password\":\"...\"}]",
      "GARMIN_TOKEN_ROOT": "C:\\Users\\mscha\\.garmin-mcp-unified"
    }
  }
}
```

### Scenario: circuit breaker stuck open for a user

A user's circuit breaker opens after 3 auth failures in 60 seconds. It auto-recovers in 5 minutes (half-open → next call closes it). If the user's account has a genuine auth issue:
1. Check the MFA recovery procedure above
2. Check that password hasn't changed in Garmin Connect
3. Delete the user's token cache dir: `rm -rf ${GARMIN_TOKEN_ROOT}/${userId}/`
4. Restart Claude Code — lazy auth will re-authenticate from scratch

---

## Fork Maintenance

This is a long-running fork. Upstream: `Nicolasvegam/garmin-connect-mcp`.

**Monthly upstream sync cadence.** Tag sync commits `[upstream-sync]`. Every patch re-application should start with `FORK_PATCH.md` to identify conflict-prone files. See `FORK_PATCH.md` for the full list of modified lines.

---

## License

MIT (upstream) — fork maintained at `mscharwere/garmin-unified-mcp`.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "garmin": {
      "command": "npx",
      "args": ["-y", "@nicolasvegam/garmin-connect-mcp"],
      "env": {
        "GARMIN_EMAIL": "you@email.com",
        "GARMIN_PASSWORD": "yourpass"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "garmin": {
      "command": "npx",
      "args": ["-y", "@nicolasvegam/garmin-connect-mcp"],
      "env": {
        "GARMIN_EMAIL": "you@email.com",
        "GARMIN_PASSWORD": "yourpass"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "garmin": {
      "command": "npx",
      "args": ["-y", "@nicolasvegam/garmin-connect-mcp"],
      "env": {
        "GARMIN_EMAIL": "you@email.com",
        "GARMIN_PASSWORD": "yourpass"
      }
    }
  }
}
```

### Any MCP Client

Run the server with environment variables:

```bash
GARMIN_EMAIL=you@email.com GARMIN_PASSWORD=yourpass npx -y @nicolasvegam/garmin-connect-mcp
```

The server communicates over stdio using the [Model Context Protocol](https://modelcontextprotocol.io/).

## Available Tools

### Activities (12 tools)
| Tool | Description |
|------|-------------|
| `get_activities` | List recent activities with pagination |
| `get_activities_by_date` | Search activities within a date range |
| `get_last_activity` | Get the most recent activity |
| `count_activities` | Get total number of activities |
| `get_activity` | Summary data for a specific activity |
| `get_activity_details` | Detailed metrics: HR, pace, elevation time series |
| `get_activity_splits` | Per-km or per-mile split data |
| `get_activity_weather` | Weather conditions during activity |
| `get_activity_hr_zones` | Time in each heart rate zone |
| `get_activity_exercise_sets` | Strength training sets (reps, weight) |
| `get_activity_types` | All available activity types |
| `get_progress_summary` | Fitness stats over a date range by activity type |

### Daily Health (14 tools)
| Tool | Description |
|------|-------------|
| `get_daily_summary` | Full daily summary (steps, calories, distance, etc.) |
| `get_steps` | Step count for a date |
| `get_steps_chart` | Intraday step data throughout the day |
| `get_heart_rate` | Heart rate data (resting, max, zones, time series) |
| `get_resting_heart_rate` | Resting heart rate for a date |
| `get_stress` | Stress levels and time series |
| `get_body_battery` | Body Battery energy levels (date range) |
| `get_body_battery_events` | Battery charge/drain events for a day |
| `get_respiration` | Breathing rate data |
| `get_spo2` | Blood oxygen saturation |
| `get_intensity_minutes` | Moderate/vigorous intensity minutes |
| `get_floors` | Floors climbed chart data |
| `get_hydration` | Daily hydration/water intake |
| `get_daily_events` | Daily wellness events |

### Trends (4 tools)
| Tool | Description |
|------|-------------|
| `get_daily_steps_range` | Daily step counts over a date range |
| `get_weekly_steps` | Weekly step aggregates |
| `get_weekly_stress` | Weekly stress aggregates |
| `get_weekly_intensity_minutes` | Weekly intensity minutes |

### Sleep (2 tools)
| Tool | Description |
|------|-------------|
| `get_sleep_data` | Sleep stages, score, bed/wake times |
| `get_sleep_data_raw` | Raw sleep data with HR and SpO2 |

### Body Composition (5 tools)
| Tool | Description |
|------|-------------|
| `get_body_composition` | Weight, BMI, body fat %, muscle mass (date range) |
| `get_latest_weight` | Most recent weight entry |
| `get_daily_weigh_ins` | All weigh-ins for a date |
| `get_weigh_ins` | Weigh-in records over a date range |
| `get_blood_pressure` | Blood pressure readings (date range) |

### Performance & Training (11 tools)
| Tool | Description |
|------|-------------|
| `get_vo2max` | VO2 Max estimate (running/cycling) |
| `get_training_readiness` | Training Readiness score |
| `get_training_status` | Training status and load |
| `get_hrv` | Heart Rate Variability |
| `get_endurance_score` | Endurance fitness score |
| `get_hill_score` | Climbing performance score |
| `get_race_predictions` | 5K/10K/half/full marathon predictions |
| `get_fitness_age` | Estimated fitness age |
| `get_personal_records` | All personal records |
| `get_lactate_threshold` | Lactate threshold HR and pace |
| `get_cycling_ftp` | Functional Threshold Power (cycling) |

### Profile & Devices (13 tools)
| Tool | Description |
|------|-------------|
| `get_user_profile` | User social profile and preferences |
| `get_user_settings` | User settings, measurement system, sleep schedule |
| `get_devices` | Registered Garmin devices |
| `get_device_settings` | Settings for a specific device |
| `get_device_last_used` | Last used device info |
| `get_primary_training_device` | Primary training device |
| `get_device_solar_data` | Solar charging data |
| `get_gear` | All tracked gear/equipment |
| `get_gear_stats` | Usage stats for a gear item |
| `get_goals` | Active goals and progress |
| `get_earned_badges` | Earned badges and achievements |
| `get_workouts` | Saved workouts |
| `get_workout` | Specific workout by ID |

## Authentication

Uses Garmin Connect credentials (email/password) via environment variables. OAuth tokens are cached in `~/.garmin-mcp/` to avoid re-authentication on each request.

### MFA (Multi-Factor Authentication)

If your Garmin account has MFA enabled (required for devices with ECG capabilities), you need to run the interactive setup once before using the MCP server:

```bash
GARMIN_EMAIL='you@email.com' GARMIN_PASSWORD='yourpass' npx -y @nicolasvegam/garmin-connect-mcp setup
```

This will:
1. Log in to Garmin Connect
2. Prompt you for the MFA code sent to your email or authenticator app
3. Save OAuth tokens to `~/.garmin-mcp/`

After setup, the MCP server will use the saved tokens automatically — no MFA prompt needed until the tokens expire. When they do, simply run the setup command again.

## Development

```bash
git clone https://github.com/Nicolasvegam/garmin-connect-mcp.git
cd garmin-connect-mcp
npm install
npm run build
```

To test locally:

```bash
GARMIN_EMAIL=you@email.com GARMIN_PASSWORD=yourpass npm start
```

## Credits

- API endpoints and authentication flow based on [`python-garminconnect`](https://github.com/cyberjunky/python-garminconnect) by [cyberjunky](https://github.com/cyberjunky)

## License

MIT
