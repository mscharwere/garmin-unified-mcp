// KAREN Phase 1 (2026-05-02): refactored to take clientPool; user enum prepended.
// KAREN Phase 2 (2026-05-02): converted to registerCompactedTool; verbose flag added.
// KAREN fix/wake-value-correctness (2026-05-05): added get_body_battery_at_wake.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientPool } from '../client/client-pool.js';
import { dateParamSchema, dateRangeOptionalEndSchema } from '../dtos';
import { dateString } from '../constants';
import { registerCompactedTool } from '../register-helpers.js';
import { callWithBreaker, successResponse } from './tool-helpers.js';

export function registerHealthTools(server: McpServer, clientPool: ClientPool): void {
  registerCompactedTool(
    server, clientPool, 'get_daily_summary',
    'Get full daily summary: steps, calories, distance, floors, active minutes, heart rate, stress, body battery',
    dateParamSchema.shape,
    (client, { date }) => client.getDailySummary(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_steps',
    'Get step count for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getDailySummary(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_steps_chart',
    'Get detailed intraday step data throughout the day (step chart)',
    dateParamSchema.shape,
    (client, { date }) => client.getStepsChart(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_heart_rate',
    'Get daily heart rate data: resting HR, max HR, min HR, and time series throughout the day',
    dateParamSchema.shape,
    (client, { date }) => client.getHeartRate(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_resting_heart_rate',
    'Get resting heart rate data for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getRestingHeartRate(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_stress',
    'Get daily stress levels: overall score, time in rest/low/medium/high stress, and time series. Single date; for ranges use get_stress_range',
    dateParamSchema.shape,
    (client, { date }) => client.getStress(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_body_battery',
    'Get Body Battery energy levels: charged, drained, highest, lowest. endDate defaults to startDate if omitted',
    dateRangeOptionalEndSchema.shape,
    (client, { startDate, endDate }) => client.getBodyBattery(startDate, endDate ?? startDate),
  );

  registerCompactedTool(
    server, clientPool, 'get_body_battery_events',
    'Get Body Battery charge and drain events for a day (what charged/drained your battery)',
    dateParamSchema.shape,
    (client, { date }) => client.getBodyBatteryEvents(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_respiration',
    'Get daily respiration rate data throughout the day. Single date; for ranges use get_respiration_range',
    dateParamSchema.shape,
    (client, { date }) => client.getRespiration(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_spo2',
    'Get blood oxygen saturation (SpO2) data for a specific date. Single date; for ranges use get_spo2_range',
    dateParamSchema.shape,
    (client, { date }) => client.getSpO2(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_intensity_minutes',
    'Get moderate and vigorous intensity minutes for a date',
    dateParamSchema.shape,
    (client, { date }) => client.getIntensityMinutes(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_floors',
    'Get floors climbed chart data for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getFloors(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_hydration',
    'Get daily hydration data (water intake)',
    dateParamSchema.shape,
    (client, { date }) => client.getHydration(date),
  );

  registerCompactedTool(
    server, clientPool, 'get_daily_events',
    'Get daily wellness events for a specific date',
    dateParamSchema.shape,
    (client, { date }) => client.getDailyEvents(date),
  );

  // ---------------------------------------------------------------------------
  // get_body_battery_at_wake — KAREN fix/wake-event-lookup (2026-05-06)
  //
  // Uses raw server.registerTool (not registerCompactedTool) because it requires
  // two upstream calls (getBodyBattery + getBodyBatteryEvents) and returns a
  // pre-computed shape rather than routing a single raw payload through a compactor.
  //
  // Returns the Body Battery value at the actual wake-up time, derived by joining
  // the intraday BB time-series with the sleep events endpoint to find the sleep
  // event end timestamp, then finding the closest BB sample to that moment.
  //
  // Real upstream shapes (captured 2026-05-06):
  //   getBodyBatteryEvents → [{ event: { eventType, eventStartTimeGmt,
  //                                       durationInMilliseconds, ... }, ... }]
  //     • eventType lives at e.event.eventType (wrapped), NOT e.eventType
  //     • duration is durationInMilliseconds (NOT durationInSeconds)
  //     • start is eventStartTimeGmt (NOT startTimestampGMT)
  //     • no endTimestampGMT field — must compute: start + durationInMilliseconds
  //   getBodyBattery → [{ bodyBatteryValuesArray: [[ts_ms, level], ...] }]
  //     • 2-tuple, index 1 is the numeric BB level
  //
  // Edge case: if no sleep event is found, returns wakeValue: null with
  // confidence='unavailable'. The previous "estimated_from_lowest" heuristic
  // was broken-by-design — recovery nights have their nadir pre-bed or mid-night,
  // not at wake. Better to return null than a confidently wrong number.
  // ---------------------------------------------------------------------------
  const userEnum = z.enum(clientPool.userEnum);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).registerTool(
    'get_body_battery_at_wake',
    {
      description:
        'Get the Body Battery value at wake-up time for a given date, derived by joining the ' +
        'intraday BB time-series with the sleep events endpoint. Returns wakeValue, wakeTimestamp, ' +
        'and a confidence indicator. Use this instead of get_body_battery\'s deprecated wakeValue ' +
        'field, which is the 00:00 midnight reading — not the actual wake BB. ' +
        'Edge case: if no sleep event is found in the events response, returns ' +
        'wakeValue: null with confidence=\'unavailable\' and a caveat. ' +
        'No estimation heuristic — null is more honest than a wrong number.',
      inputSchema: {
        user: userEnum,
        date: dateString.optional().describe('Date in YYYY-MM-DD format. Defaults to today if not provided'),
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any) => {
      return callWithBreaker(
        clientPool,
        args.user,
        'get_body_battery_at_wake',
        async (client) => {
          // Default to today in PT — avoids the UTC "tomorrow" bug for Carlos/Carlitos/Daniel
          // between 00:00–07:00 UTC (5 PM–midnight PT the prior calendar day).
          const resolvedDate = args.date ??
            new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

          // parseGmt: force Garmin "*Gmt" timestamp strings to UTC.
          // Garmin emits ISO-8601 without a timezone suffix (e.g. "2026-05-06T06:19:07.0").
          // JS Date parses suffix-less strings as LOCAL time on most runtimes — wrong for GMT fields.
          // Appending 'Z' forces UTC interpretation: "2026-05-06T06:19:07.0Z" → 06:19 UTC.
          function parseGmt(s: string): number {
            // Already has timezone designator — parse as-is
            if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s).getTime();
            // Strip trailing .0 / .000 fractional seconds then append Z
            return new Date(s.replace(/\.\d+$/, '') + 'Z').getTime();
          }

          // Fire both requests in parallel — independent endpoints
          const [bbRaw, eventsRaw] = await Promise.all([
            client.getBodyBattery(resolvedDate, resolvedDate),
            client.getBodyBatteryEvents(resolvedDate),
          ]);

          // ---- Parse BB time-series ----
          // getBodyBattery returns an array of day objects; take the last one.
          // bodyBatteryValuesArray entries are [timestamp_ms, bb_level] 2-tuples.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bbItems = Array.isArray(bbRaw) ? bbRaw : [bbRaw as any];
          const day = bbItems[bbItems.length - 1];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const valuesArray: Array<[number, number]> = Array.isArray(day?.bodyBatteryValuesArray)
            ? day.bodyBatteryValuesArray
            : [];

          // ---- Parse sleep events ----
          // BB-1 fix: getBodyBatteryEvents wraps the event object: [{ event: {...}, ... }]
          // Normalize both wrapped (e.event) and unwrapped (e) shapes for forward-compat.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawEvents: any[] = Array.isArray(eventsRaw)
            ? eventsRaw
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : (eventsRaw as any)?.events ?? [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const events = rawEvents.map((e: any) => e?.event ?? e);

          // Find the sleep event: collect all events whose eventType contains 'sleep'
          // (case-insensitive), then pick the one with the longest duration so that a
          // short mid-day nap can never beat an overnight session when Garmin returns
          // multiple sleep events in the array.  Tie-break: latest end timestamp (most
          // recent sleep wins over an equally-long older one).  Single match uses the
          // same code path with no extra overhead.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sleepEvents = events.filter((e: any) =>
            typeof e?.eventType === 'string' &&
            e.eventType.toLowerCase().includes('sleep'),
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let sleepEvent: any | undefined;
          if (sleepEvents.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sleepEvent = sleepEvents.reduce((best: any, candidate: any) => {
              // BB-2 fix: upstream uses durationInMilliseconds (not durationInSeconds)
              const bestDurMs = best?.durationInMilliseconds ?? 0;
              const candDurMs = candidate?.durationInMilliseconds ?? 0;
              if (candDurMs > bestDurMs) return candidate;
              if (candDurMs === bestDurMs) {
                // Tie-break: latest computed end timestamp
                // BB-3 fix: start field is eventStartTimeGmt (not startTimestampGMT)
                const bestEnd = best?.eventStartTimeGmt
                  ? parseGmt(best.eventStartTimeGmt) + bestDurMs
                  : 0;
                const candEnd = candidate?.eventStartTimeGmt
                  ? parseGmt(candidate.eventStartTimeGmt) + candDurMs
                  : 0;
                return candEnd > bestEnd ? candidate : best;
              }
              return best;
            });
          }

          // ---- No sleep event → unavailable (BB-4: kill broken heuristic) ----
          // The previous "estimated_from_lowest" fallback was broken-by-design:
          // on recovery nights the BB nadir is pre-bed or mid-night, not at wake.
          // Returning a confidently wrong number is worse than returning null.
          if (!sleepEvent) {
            return successResponse({
              date: resolvedDate,
              user: args.user,
              wakeTimestamp: null,
              wakeValue: null,
              confidence: 'unavailable' as const,
              caveat:
                'No sleep event found in body-battery events response for this date. ' +
                'Re-run after device sync or use get_body_battery_events to investigate.',
            });
          }

          // ---- Sleep event found → join on timestamp ----
          // BB-3 fix: compute end from eventStartTimeGmt + durationInMilliseconds.
          // There is no endTimestampGMT field in the upstream response.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = sleepEvent as any;
          let sleepEndMs: number | null = null;

          // BB-2 + BB-3 fix: use eventStartTimeGmt + durationInMilliseconds.
          // parseGmt forces UTC interpretation (Garmin omits timezone suffix).
          if (e.eventStartTimeGmt != null && e.durationInMilliseconds != null) {
            sleepEndMs = parseGmt(e.eventStartTimeGmt) + e.durationInMilliseconds;
          }

          if (sleepEndMs == null || valuesArray.length === 0) {
            // Can't resolve timestamp → unavailable (not estimated)
            return successResponse({
              date: resolvedDate,
              user: args.user,
              wakeTimestamp: null,
              wakeValue: null,
              confidence: 'unavailable' as const,
              caveat:
                'Sleep event found but could not resolve end timestamp (missing eventStartTimeGmt ' +
                'or durationInMilliseconds) or BB time-series is empty.',
            });
          }

          // Find the BB entry closest to the sleep event end timestamp
          // valuesArray entries: [timestamp_ms, bb_value, delta]
          let closestEntry = valuesArray[0];
          let closestDiff = Math.abs(valuesArray[0][0] - sleepEndMs);

          for (const entry of valuesArray) {
            const diff = Math.abs(entry[0] - sleepEndMs);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestEntry = entry;
            }
          }

          return successResponse({
            date: resolvedDate,
            user: args.user,
            wakeTimestamp: new Date(closestEntry[0]).toISOString(),
            wakeValue: closestEntry[1],
            confidence: 'sleep_event' as const,
          });
        },
      );
    },
  );
}
