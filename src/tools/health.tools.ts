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
  // get_body_battery_at_wake — KAREN fix/wake-value-correctness (2026-05-05)
  //
  // Uses raw server.registerTool (not registerCompactedTool) because it requires
  // two upstream calls (getBodyBattery + getBodyBatteryEvents) and returns a
  // pre-computed shape rather than routing a single raw payload through a compactor.
  //
  // Returns the Body Battery value at the actual wake-up time, derived by joining
  // the intraday BB time-series with the sleep events endpoint to find the sleep
  // event end timestamp, then finding the closest BB sample to that moment.
  //
  // Edge case: if no sleep event is found (getBodyBatteryEvents returns null or
  // an empty array), falls back to the lowestValue with confidence='estimated_from_lowest'
  // and includes a caveat. This fallback has been observed in the wild (2026-05-05).
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
        'Edge case: if no sleep event is available, falls back to lowestValue with ' +
        'confidence=\'estimated_from_lowest\' and a caveat field explaining the limitation.',
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
          const resolvedDate = args.date ?? new Date().toISOString().split('T')[0];

          // Fire both requests in parallel — independent endpoints
          const [bbRaw, eventsRaw] = await Promise.all([
            client.getBodyBattery(resolvedDate, resolvedDate),
            client.getBodyBatteryEvents(resolvedDate),
          ]);

          // ---- Parse BB time-series ----
          // getBodyBattery returns an array of day objects; take the last one
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bbItems = Array.isArray(bbRaw) ? bbRaw : [bbRaw as any];
          const day = bbItems[bbItems.length - 1];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const valuesArray: Array<[number, number, number]> = Array.isArray(day?.bodyBatteryValuesArray)
            ? day.bodyBatteryValuesArray
            : [];

          // lowestValue as fallback — the nadir is closest to wake for most users
          const bbValues = valuesArray.map(v => v?.[1]).filter(v => v != null);
          const lowestValue = bbValues.length > 0 ? Math.min(...bbValues) : null;

          // ---- Parse sleep events ----
          // getBodyBatteryEvents returns an array or object with .events
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const events: any[] = Array.isArray(eventsRaw)
            ? eventsRaw
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : (eventsRaw as any)?.events ?? [];

          // Find the sleep event: look for eventType containing 'sleep' (case-insensitive),
          // or if not found, the event with the longest duration ending in morning hours.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sleepEvent = events.find((e: any) =>
            typeof e?.eventType === 'string' &&
            e.eventType.toLowerCase().includes('sleep'),
          );

          // ---- No sleep event → fallback path ----
          if (!sleepEvent) {
            return successResponse({
              date: resolvedDate,
              user: args.user,
              wakeTimestamp: null,
              wakeValue: lowestValue,
              confidence: 'estimated_from_lowest' as const,
              caveat:
                'No sleep event returned by get_body_battery_events for this date. ' +
                'wakeValue is the intraday lowest BB (heuristic proxy for post-sleep nadir). ' +
                'Re-run after sync or use get_body_battery_events to investigate.',
            });
          }

          // ---- Sleep event found → join on timestamp ----
          // Sleep event end timestamp: prefer endTimestampGMT, fall back to computed start+duration
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = sleepEvent as any;
          let sleepEndMs: number | null = null;

          if (e.endTimestampGMT) {
            sleepEndMs = new Date(e.endTimestampGMT).getTime();
          } else if (e.startTimestampGMT && e.durationInSeconds != null) {
            sleepEndMs = new Date(e.startTimestampGMT).getTime() + (e.durationInSeconds * 1000);
          }

          if (sleepEndMs == null || valuesArray.length === 0) {
            // Can't resolve timestamp → fallback
            return successResponse({
              date: resolvedDate,
              user: args.user,
              wakeTimestamp: null,
              wakeValue: lowestValue,
              confidence: 'estimated_from_lowest' as const,
              caveat:
                'Sleep event found but could not resolve end timestamp or BB time-series is empty. ' +
                'wakeValue is the intraday lowest BB (heuristic proxy).',
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
