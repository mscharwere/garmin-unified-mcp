/**
 * compactors.test.ts — KAREN Phase 2 (2026-05-02)
 *
 * CI assertions per design §10.7 and ARIIA non-negotiables #2 and #8:
 *   1. Per-compactor byte-ratio assertion: compacted ≤ N% of full bytes
 *   2. Per-compactor shape assertion: all expected compact fields non-undefined
 *   3. Snapshot assertion: compact output shape stable across fixture inputs
 *   4. verbose=true round-trip: returns full payload byte-identical
 *
 * Fixtures are hand-pinned (not auto-generated) per §10 acceptance criteria.
 * Located under tests/fixtures/<tool>.[variant.]full.json
 *
 * Byte-ratio thresholds per §10.2 prescriptions:
 *   - get_sleep_data: ≤5% (design prescribes ~98% reduction)
 *   - get_activity: ≤20% (design prescribes ~80% reduction)
 *   - get_activity_details: ≤10% (design prescribes ~96% reduction)
 *   - all other non-identity compactors: ≤70% (§10 general floor: 30% reduction)
 *
 * Identity compactors are excluded from byte-ratio assertions (ratio = 1.0 by definition).
 */

import { describe, it, expect } from 'vitest';
import { compactors } from '../src/compactors.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
import sleepDataFull from './fixtures/get_sleep_data.full.json';
import activityCardioFull from './fixtures/get_activity.cardio.full.json';
import activityTeamSportFull from './fixtures/get_activity.team-sport.full.json';
import activityDetailsCardioFull from './fixtures/get_activity_details.cardio.full.json';
import activityDetailsTeamSportFull from './fixtures/get_activity_details.team-sport.full.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function byteLen(obj: unknown): number {
  return JSON.stringify(obj).length;
}

function byteRatio(compact: unknown, full: unknown): number {
  return byteLen(compact) / byteLen(full);
}

/**
 * applyVerbose simulates the MCP handler's verbose flag:
 *   verbose=true  → return full payload (raw, identity)
 *   verbose=false → return compactors[toolName](payload)
 *
 * The MCP handler does: `verbose ? payload : compactors[toolName](payload)`
 */
function applyVerbose(full: unknown, verbose: boolean, compactor: (x: unknown) => unknown): unknown {
  return verbose ? full : compactor(full);
}

// ---------------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------------

describe('get_sleep_data compactor', () => {
  const full = sleepDataFull;
  const compact = compactors.get_sleep_data(full);

  it('matches committed snapshot', () => {
    expect(compact).toMatchSnapshot();
  });

  it('compact bytes ≤5% of full (§10.2: ~98% reduction)', () => {
    expect(byteRatio(compact, full)).toBeLessThan(0.05);
  });

  it('all expected compact fields non-undefined (shape assertion)', () => {
    expect(compact.date).toBeDefined();
    expect(compact.sleepScore).toBeDefined();
    expect(compact.sleepDurationMinutes).toBeDefined();
    expect(compact.deepMinutes).toBeDefined();
    expect(compact.remMinutes).toBeDefined();
    expect(compact.lightMinutes).toBeDefined();
    expect(compact.awakeMinutes).toBeDefined();
    // restingHR and avgHRV may be null but field must exist
    expect('restingHR' in compact).toBe(true);
    expect('avgRespiration' in compact).toBe(true);
    expect('avgHRV' in compact).toBe(true);
    expect('bodyBatteryDelta' in compact).toBe(true);
  });

  it('compact values are correct', () => {
    expect(compact.date).toBe('2026-04-26');
    expect(compact.sleepScore).toBe(79);
    expect(compact.restingHR).toBe(49);
    expect(compact.avgHRV).toBe(52);
    expect(compact.avgRespiration).toBe(14.3);
    expect(compact.bodyBatteryDelta).toBe(61);
  });

  it('verbose=true round-trips full payload byte-identical', () => {
    expect(JSON.stringify(full)).toEqual(JSON.stringify(applyVerbose(full, true, compactors.get_sleep_data)));
  });

  it('verbose=false returns compact output (different from full)', () => {
    const compacted = applyVerbose(full, false, compactors.get_sleep_data);
    // Compact output must differ from raw — if they were identical this would indicate a tautology
    expect(JSON.stringify(compacted)).not.toEqual(JSON.stringify(full));
    // And must equal the direct compactor output
    expect(JSON.stringify(compacted)).toEqual(JSON.stringify(compactors.get_sleep_data(full)));
  });
});

// ---------------------------------------------------------------------------
// Activities — cardio fixture
// ---------------------------------------------------------------------------

describe('get_activity compactor (cardio fixture)', () => {
  const full = activityCardioFull;
  const compact = compactors.get_activity(full);

  it('matches committed snapshot', () => {
    expect(compact).toMatchSnapshot();
  });

  it('compact bytes ≤20% of full (§10.2: ~80% reduction)', () => {
    expect(byteRatio(compact, full)).toBeLessThan(0.20);
  });

  it('shape assertion — expected fields present', () => {
    expect(compact.activityId).toBeDefined();
    expect(compact.activityType).toBeDefined();
    expect(compact.startTimeLocal).toBeDefined();
    expect('durationMinutes' in compact).toBe(true);
    expect('distanceKm' in compact).toBe(true);
    expect('avgHR' in compact).toBe(true);
    expect('maxHR' in compact).toBe(true);
    expect('trainingEffectAerobic' in compact).toBe(true);
    expect('trainingEffectAnaerobic' in compact).toBe(true);
    expect('trainingLoad' in compact).toBe(true);
  });

  it('correct values extracted from cardio fixture', () => {
    expect(compact.activityType).toBe('running');
    expect(compact.avgHR).toBe(154);
    expect(compact.maxHR).toBe(181);
    expect(compact.durationMinutes).toBe(48); // 2856/60 ≈ 47.6 → 48
    expect(compact.trainingEffectAerobic).toBe(3.4);
  });
});

// ---------------------------------------------------------------------------
// Activities — team sport fixture
// ---------------------------------------------------------------------------

describe('get_activity compactor (team-sport fixture)', () => {
  const full = activityTeamSportFull;
  const compact = compactors.get_activity(full);

  it('matches committed snapshot', () => {
    expect(compact).toMatchSnapshot();
  });

  it('compact bytes ≤20% of full (§10.2: ~80% reduction)', () => {
    expect(byteRatio(compact, full)).toBeLessThan(0.20);
  });

  it('shape assertion — fields present even with null values for N/A metrics', () => {
    expect(compact.activityType).toBe('soccer');
    expect('avgRunCadence' in compact).toBe(true); // null for soccer — field must exist
    expect('avgPower' in compact).toBe(true);        // null for soccer
    expect('vO2MaxValue' in compact).toBe(true);     // null for soccer
    expect(compact.avgHR).toBe(154);
    expect(compact.maxHR).toBe(191);
  });

  it('catches type-specific null fields that would not appear in cardio', () => {
    // Soccer does not have avgRunCadence — must not throw, must return null
    expect(compact.avgRunCadence).toBeNull();
    // Jump count not in compact shape — not surfaced (acceptable)
  });
});

// ---------------------------------------------------------------------------
// Activity Details — cardio fixture
// ---------------------------------------------------------------------------

describe('get_activity_details compactor (cardio fixture)', () => {
  const full = activityDetailsCardioFull;
  const compact = compactors.get_activity_details(full);

  it('matches committed snapshot', () => {
    expect(compact).toMatchSnapshot();
  });

  it('compact bytes ≤10% of full (§10.2: ~96% reduction)', () => {
    expect(byteRatio(compact, full)).toBeLessThan(0.10);
  });

  it('shape assertion', () => {
    expect('activityId' in compact).toBe(true);
    expect('summaryFromActivity' in compact).toBe(true);
    expect('metricSummary' in compact).toBe(true);
    expect('samplesAvailableViaVerbose' in compact).toBe(true);
  });

  it('samplesAvailableViaVerbose is true when metrics present', () => {
    expect(compact.samplesAvailableViaVerbose).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Activity Details — team sport fixture
// ---------------------------------------------------------------------------

describe('get_activity_details compactor (team-sport fixture)', () => {
  const full = activityDetailsTeamSportFull;
  const compact = compactors.get_activity_details(full);

  it('matches committed snapshot', () => {
    expect(compact).toMatchSnapshot();
  });

  it('compact bytes ≤10% of full (§10.2: ~96% reduction)', () => {
    expect(byteRatio(compact, full)).toBeLessThan(0.10);
  });

  it('shape assertion', () => {
    expect('activityId' in compact).toBe(true);
    expect('summaryFromActivity' in compact).toBe(true);
    expect(compact.samplesAvailableViaVerbose).toBe(true);
  });

  it('null avgPower does not crash compactor', () => {
    // Soccer activities have null power — compact must not throw
    expect(compact.summaryFromActivity).toBeDefined();
    expect(compact.summaryFromActivity?.avgPower).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// get_activities (array)
// ---------------------------------------------------------------------------

describe('get_activities compactor', () => {
  const fullArray = [activityCardioFull, activityTeamSportFull];
  const compact = compactors.get_activities(fullArray);

  it('matches committed snapshot', () => {
    expect(compact).toMatchSnapshot();
  });

  it('compact bytes ≤20% of full', () => {
    expect(byteRatio(compact, fullArray)).toBeLessThan(0.20);
  });

  it('returns array of same length', () => {
    expect(Array.isArray(compact)).toBe(true);
    expect(compact.length).toBe(2);
  });

  it('each row has expected fields', () => {
    for (const row of compact) {
      expect('activityId' in row).toBe(true);
      expect('activityType' in row).toBe(true);
      expect('durationMinutes' in row).toBe(true);
      expect('avgHR' in row).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Exhaustiveness: all non-identity compactors reduce byte count
// ---------------------------------------------------------------------------
// These tools have non-identity compactors but we don't have full fixtures for them.
// We instead test with representative minimal inputs to verify they don't throw
// and do reduce byte count when given realistic-shape data.

describe('non-identity compactors — smoke tests with minimal fixtures', () => {
  const TOLERANCE = 0.70; // 30% minimum reduction

  it('get_daily_summary reduces bytes by ≥30%', () => {
    const full = {
      calendarDate: '2026-04-26',
      totalSteps: 8240,
      dailyStepGoal: 10000,
      totalKilocalories: 2740,
      activeKilocalories: 612,
      floorsAscended: 12,
      minHeartRate: 47,
      maxHeartRate: 168,
      restingHeartRateValue: 49,
      averageStressLevel: 24,
      maxStressLevel: 78,
      stressDuration: 24600,
      bodyBatteryHighestValue: 94,
      bodyBatteryLowestValue: 22,
      totalDistanceMeters: 5640,
      moderateIntensityMinutes: 28,
      vigorousIntensityMinutes: 14,
      // UI-only bloat
      wellnessStartTimeGMT: '2026-04-26 07:00:00',
      wellnessEndTimeGMT: '2026-04-27 07:00:00',
      wellnessDescription: null,
      averageSPO2: null,
      floorsAscendedInMeters: 36.0,
      floorsDescendedInMeters: 33.0,
      highlyActiveSeconds: 840,
      activeSeconds: 1680,
      sedentarySeconds: 54000,
      sleepingSeconds: 26640,
      includesWellnessData: true,
      includesActivityData: false,
      includesCalorieConsumedData: false,
      privacyProtected: false,
      hrlyHeartRateValues: Array(24).fill({ startTimeGMT: '2026-04-26 07:00:00', value: 65 }),
    };
    const compact = compactors.get_daily_summary(full);
    expect(byteRatio(compact, full)).toBeLessThan(TOLERANCE);
    expect(compact.totalSteps).toBe(8240);
    expect(compact.restingHeartRate).toBe(49);
  });

  it('get_hrv reduces bytes by ≥30%', () => {
    const full = {
      hrvSummary: {
        calendarDate: '2026-04-26',
        weeklyAvg: 52,
        lastNightAvg: 48,
        lastNightStatus: 'BALANCED',
        baseline: { lowUpper: 42, balancedLower: 44, balancedUpper: 60, markerValue: 51 },
        // Bloat
        hrvSummaryResponseStr: 'BALANCED',
        startTimestampGMT: '2026-04-25 20:00:00',
        endTimestampGMT: '2026-04-26 07:00:00',
        startTimestampLocal: '2026-04-25 13:00:00',
        endTimestampLocal: '2026-04-26 00:00:00',
        status: 'COMPLETE',
        feedback: {
          summaryMessage: 'Your body is ready.',
          interpretation: 'GOOD',
          feedbackPhrase: 'HRV_BALANCED_3',
          lowUpper: 42,
          balancedLower: 44,
          balancedUpper: 60,
          markerValue: 51,
          startTimestampGMT: '2026-04-25 20:00:00',
          endTimestampGMT: '2026-04-26 07:00:00',
        },
      },
      hrvReadings: Array(200).fill({ hrvValue: 48, readingTimestampGMT: '2026-04-26 01:00:00', readingTimestampLocal: '2026-04-25 18:00:00' }),
    };
    const compact = compactors.get_hrv(full);
    expect(byteRatio(compact, full)).toBeLessThan(TOLERANCE);
    expect(compact.weeklyAvg).toBe(52);
    expect(compact.lastNightStatus).toBe('BALANCED');
  });

  it('get_body_battery reduces bytes by ≥30%', () => {
    const bodyBatteryValues = Array.from({ length: 480 }, (_, i) => [
      Date.now() + i * 60000,
      22 + Math.floor(i * 0.15),
      i < 240 ? 1 : -1,
    ]);
    const full = [{ date: '2026-04-26', bodyBatteryValuesArray: bodyBatteryValues }];
    const compact = compactors.get_body_battery(full);
    expect(byteRatio(compact, full)).toBeLessThan(TOLERANCE);
    // midnightValue is the 00:00 boundary reading (values[0])
    expect('midnightValue' in compact).toBe(true);
    expect(compact.midnightValue).toBe(22); // first entry's bb value
    // wakeValue is a deprecated alias for midnightValue (NOT actual wake BB)
    expect('wakeValue' in compact).toBe(true);
    expect(compact.wakeValue).toBe(compact.midnightValue); // alias must equal midnightValue
    expect('highestValue' in compact).toBe(true);
    expect('lowestValue' in compact).toBe(true);
    expect('endOfDayValue' in compact).toBe(true);
  });

  it('get_heart_rate reduces bytes by ≥30%', () => {
    const full = {
      calendarDate: '2026-04-26',
      restingHeartRate: 49,
      minHeartRate: 47,
      maxHeartRate: 168,
      lastSevenDaysAvgRestingHR: 50,
      heartRateValues: Array(720).fill([Date.now(), 65]),
      timestampOfEarliestRestingHR: '2026-04-26 06:30:00',
      userProfilePK: 12345678,
      maxHeartRateTimestamp: '2026-04-26 14:45:00',
      minHeartRateTimestamp: '2026-04-26 04:12:00',
      startTimestampGMT: '2026-04-26 07:00:00',
      endTimestampGMT: '2026-04-27 07:00:00',
    };
    const compact = compactors.get_heart_rate(full);
    expect(byteRatio(compact, full)).toBeLessThan(TOLERANCE);
    expect(compact.restingHR).toBe(49);
    expect(compact.minHR).toBe(47);
    expect(compact.maxHR).toBe(168);
  });

  it('get_sleep_data_range reduces bytes by ≥30%', () => {
    // 3-day range — each entry has a full sleep payload
    const full = [
      { date: '2026-04-24', data: sleepDataFull },
      { date: '2026-04-25', data: sleepDataFull },
      { date: '2026-04-26', data: sleepDataFull },
    ];
    const compact = compactors.get_sleep_data_range(full);
    expect(byteRatio(compact, full)).toBeLessThan(0.10); // ~98% reduction
    expect(Array.isArray(compact)).toBe(true);
    expect(compact.length).toBe(3);
  });

  it('get_training_readiness reduces bytes by ≥30% (legacy trainingReadinessDTOList shape)', () => {
    // Legacy shape: { trainingReadinessDTOList: [...] } — kept for safety even though
    // live upstream returns a bare array. Real field names use *FactorPercent suffix.
    const full = {
      trainingReadinessDTOList: [
        {
          calendarDate: '2026-04-26',
          score: 79,
          level: 'GOOD',
          feedbackLong: 'YOUR_BODY_READY',
          sleepScore: 79,
          // TR-2: real field names — *FactorPercent suffix
          sleepHistoryFactorPercent: 82,
          recoveryTimeFactorPercent: 95,
          hrvFactorPercent: 55,
          hrvWeeklyAverage: 52,
          // acwrFactorPercent = acute:chronic workload ratio (NOT acuteLoadFactor)
          acwrFactorPercent: 100,
          stressHistoryFactorPercent: 78,
          validSleep: true,
          inputContext: 'AFTER_WAKEUP_RESET',
          // UI bloat
          displayedScore: 79,
          startTimestampGMT: '2026-04-26 00:00:00',
          endTimestampGMT: '2026-04-26 23:59:59',
          factors: {
            sleepScore: 79,
            sleepHistory: 82,
            recoveryTime: 95,
            acuteLoad: 60,
            hrv: 55,
            stressHistory: 78,
          },
          userProfilePK: 12345678,
          levelDisplayName: 'GOOD',
          levelColor: '#00BB00',
          timestamp: '2026-04-26T13:00:00.0',
        },
      ],
    };
    const compact = compactors.get_training_readiness(full);
    expect(byteRatio(compact, full)).toBeLessThan(TOLERANCE);
    expect(compact.score).toBe(79);
    expect(compact.level).toBe('GOOD');
    expect(compact.hrvWeeklyAverage).toBe(52);
    expect(compact.sleepHistoryFactorPercent).toBe(82);
    expect(compact.recoveryTimeFactorPercent).toBe(95);
    expect(compact.hrvFactorPercent).toBe(55);
    expect(compact.acwrFactorPercent).toBe(100);
    expect(compact.inputContext).toBe('AFTER_WAKEUP_RESET');
    expect(compact.validSleep).toBe(true);
  });

  it('get_stress reduces bytes by ≥30%', () => {
    const full = {
      calendarDate: '2026-04-26',
      avgStressLevel: 24,
      maxStressLevel: 78,
      restStressDuration: 22800,
      lowStressDuration: 24600,
      mediumStressDuration: 10800,
      highStressDuration: 1320,
      stressChartValueOffset: -1,
      stressChartYAxisOrigin: -1,
      stressValueDescriptorsDTOList: [
        { key: 'stressChart', index: 0 },
        { key: 'bodyBattery', index: 1 },
      ],
      stressValuesArray: Array(480).fill([-1, 24, null]),
      bodyBatteryValuesArray: Array(480).fill([-1, 55, 0]),
    };
    const compact = compactors.get_stress(full);
    expect(byteRatio(compact, full)).toBeLessThan(TOLERANCE);
    expect(compact.averageStressLevel).toBe(24);
    expect(compact.maxStressLevel).toBe(78);
  });
});

// ---------------------------------------------------------------------------
// Identity compactors — verify they return input unchanged
// ---------------------------------------------------------------------------

describe('identity compactors', () => {
  const IDENTITY_TOOLS = [
    'get_sleep_data_raw',
    'get_activity_weather',
    'get_activity_exercise_sets',
    'get_activity_gear',
    'get_activity_power_in_timezones',
    'count_activities',
    'get_activity_types',
    'get_user_profile',
    'get_user_settings',
    'get_devices',
    'get_hydration',
    'get_menstrual_calendar_data',
    'set_activity_name',
    'add_weigh_in',
    'delete_activity',
  ] as const;

  for (const toolName of IDENTITY_TOOLS) {
    it(`${toolName} returns input unchanged`, () => {
      const input = { foo: 'bar', nested: { value: 42 } };
      const result = compactors[toolName](input);
      expect(result).toBe(input); // reference equality — identity compactor
    });
  }
});

// ---------------------------------------------------------------------------
// BAYMAX morning-briefing endpoints — combined token budget assertion
// §10 acceptance criterion: 6 BAYMAX morning endpoints ≤ 8,000 tokens (compact)
// ---------------------------------------------------------------------------

describe('BAYMAX morning-briefing compact token budget', () => {
  it('6-endpoint compact payload sum ≤ 8000 tokens (chars as proxy)', () => {
    // Use available fixtures + minimal synthetic data for other endpoints
    const sleepCompact = compactors.get_sleep_data(sleepDataFull);

    const hrvFull = {
      hrvSummary: {
        calendarDate: '2026-04-26',
        weeklyAvg: 52,
        lastNightAvg: 48,
        lastNightStatus: 'BALANCED',
        baseline: { lowUpper: 42, balancedLower: 44, balancedUpper: 60, markerValue: 51 },
      },
      hrvReadings: Array(100).fill({ hrvValue: 48 }),
    };
    const hrvCompact = compactors.get_hrv(hrvFull);

    const bodyBatteryFull = [{
      date: '2026-04-26',
      bodyBatteryValuesArray: Array(480).fill([Date.now(), 55, 1]),
    }];
    const bodyBatteryCompact = compactors.get_body_battery(bodyBatteryFull);

    const rhrFull = {
      allMetrics: {
        metricsMap: {
          WELLNESS_RESTING_HEART_RATE: [{ calendarDate: '2026-04-26', value: 49 }],
        },
      },
    };
    const rhrCompact = compactors.get_resting_heart_rate(rhrFull);

    const bcFull = {
      totalAverage: {
        startDate: '2026-04-26',
        weight: 74.8,
        bmi: 26.5,
        bodyFatPercentage: 22.4,
        bodyWaterPercentage: 56.1,
        boneMass: 3.2,
        muscleMass: 55.4,
        visceralFat: 9,
        metabolicAge: 38,
      },
    };
    const bcCompact = compactors.get_body_composition(bcFull);

    const trFull = {
      // TR-1: real upstream uses legacy wrapper shape here for budget test
      trainingReadinessDTOList: [{
        calendarDate: '2026-04-26',
        score: 79,
        level: 'GOOD',
        feedbackLong: 'YOUR_BODY_READY',
        sleepScore: 79,
        // TR-2: real field names use *FactorPercent suffix
        sleepHistoryFactorPercent: 82,
        recoveryTimeFactorPercent: 95,
        hrvFactorPercent: 55,
        hrvWeeklyAverage: 52,
        acwrFactorPercent: 100,
        stressHistoryFactorPercent: 78,
        validSleep: true,
        inputContext: 'AFTER_WAKEUP_RESET',
        timestamp: '2026-04-26T13:00:00.0',
      }],
    };
    const trCompact = compactors.get_training_readiness(trFull);

    const totalChars =
      byteLen(sleepCompact) +
      byteLen(hrvCompact) +
      byteLen(bodyBatteryCompact) +
      byteLen(rhrCompact) +
      byteLen(bcCompact) +
      byteLen(trCompact);

    // 8000 tokens × ~4 chars/token = 32,000 chars; use chars as a conservative proxy
    expect(totalChars).toBeLessThan(32000);
    // Tighter assertion: should be well under 8000 actual chars
    expect(totalChars).toBeLessThan(8000);
  });
});

// ---------------------------------------------------------------------------
// COLOSSUS post-game compact token budget
// §10 acceptance criterion: 4 COLOSSUS endpoints ≤ 4,000 tokens (compact)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// get_body_battery_at_wake — fixture shape tests
// KAREN fix/wake-value-correctness (2026-05-05)
//
// get_body_battery_at_wake uses the `identity` compactor because the tool itself
// performs the sleep-event join and returns a pre-computed shape (not a raw upstream
// payload). These tests validate the expected output shapes for both confidence paths.
//
// Confirmed real-world case: 2026-05-05 Carlos.
//   midnightValue (values[0]) = 32 — the 00:00 boundary reading
//   actual wake BB = 71 — derived from sleep event end ~13:40 UTC = 6:40 AM PT
// ---------------------------------------------------------------------------

import wakeAtWakeSleepEvent from './fixtures/get_body_battery_at_wake.sleep_event.json';
import wakeAtWakeFallback from './fixtures/get_body_battery_at_wake.fallback.json';
import wakeAtWakeSleepDataFallback from './fixtures/get_body_battery_at_wake.sleep_data_fallback.json';
import sleepDataCarlitos20260507 from './fixtures/garmin/get_sleep_data.2026-05-07.carlitos.json';

describe('get_body_battery_at_wake fixture shape — sleep_event confidence', () => {
  // Real-world case: 2026-05-06 Carlos.
  // Sleep event: eventStartTimeGmt=06:19:07 UTC + durationInMilliseconds=27060000ms
  //   → sleepEnd = 13:49:07 UTC = 6:49 AM PT
  // Closest BB sample: 1778074920000 (13:48:40 UTC) = level 75.
  // midnightValue for this day is 27 — confirming sleep_event join is not the midnight reading.
  const fixture = wakeAtWakeSleepEvent;

  it('has required fields', () => {
    expect(fixture.date).toBeDefined();
    expect(fixture.user).toBeDefined();
    expect(fixture.wakeValue).toBeDefined();
    expect(fixture.confidence).toBe('sleep_event');
    expect(fixture.wakeTimestamp).toBeDefined();
  });

  it('wakeValue matches expected real-world case (75) — NOT the midnight reading (27)', () => {
    expect(fixture.wakeValue).toBe(75);
  });

  it('wakeTimestamp is around 13:51 UTC (6:51 AM PT) on 2026-05-06', () => {
    const ts = new Date(fixture.wakeTimestamp as string).getTime();
    // Sleep start: parseGmt("2026-05-06T06:19:07.0") = 06:19:07 UTC
    // Sleep end: 06:19:07 UTC + 27060000ms (7h31m) = 13:50:07 UTC = 6:50 AM PT
    // Closest BB sample: 13:51:00 UTC (53s diff) — within 2 min window
    const lower = new Date('2026-05-06T13:48:00.000Z').getTime();
    const upper = new Date('2026-05-06T13:54:00.000Z').getTime();
    expect(ts).toBeGreaterThanOrEqual(lower);
    expect(ts).toBeLessThanOrEqual(upper);
  });

  it('identity compactor round-trips the shape unchanged', () => {
    // get_body_battery_at_wake uses identity compactor — shape is already compact
    const compacted = compactors.get_body_battery_at_wake(fixture);
    expect(JSON.stringify(compacted)).toEqual(JSON.stringify(fixture));
  });
});

describe('get_body_battery_at_wake fixture shape — sleep_data_fallback confidence (TARS 2026-05-07)', () => {
  // sleep_data_fallback: events endpoint empty (async classifier lag — Carlitos
  // 2026-05-07, resolved on retry minutes later), so the tool falls back to getSleepData's sleepBodyBattery array.
  // Wake BB = last sleepBodyBattery entry whose startGMT ≤ sleepEndTimestampGMT.
  const fixture = wakeAtWakeSleepDataFallback;

  it('has required fields with sleep_data_fallback confidence', () => {
    expect(fixture.date).toBeDefined();
    expect(fixture.user).toBeDefined();
    expect(fixture.wakeValue).toBeDefined();
    expect(fixture.confidence).toBe('sleep_data_fallback');
    expect(fixture.wakeTimestamp).toBeDefined();
  });

  it('wakeValue matches Carlitos 2026-05-07 real-world case (92)', () => {
    expect(fixture.wakeValue).toBe(92);
  });

  it('wakeTimestamp is 13:51 UTC (6:51 AM PT) — 60s before sleepEnd 13:52 UTC', () => {
    expect(fixture.wakeTimestamp).toBe('2026-05-07T13:51:00.000Z');
  });

  it('identity compactor round-trips the shape unchanged', () => {
    const compacted = compactors.get_body_battery_at_wake(fixture);
    expect(JSON.stringify(compacted)).toEqual(JSON.stringify(fixture));
  });
});

describe('get_body_battery_at_wake fixture shape — unavailable confidence (BB-4 fix)', () => {
  // BB-4: the old "estimated_from_lowest" heuristic is killed. Recovery nights have
  // their BB nadir pre-bed or mid-night, not at wake. Returning null is more honest.
  const fixture = wakeAtWakeFallback;

  it('has required fields', () => {
    expect(fixture.date).toBeDefined();
    expect(fixture.user).toBeDefined();
    expect('wakeValue' in fixture).toBe(true);
    // BB-4: wakeValue must be null when no sleep event is found (not estimated)
    expect(fixture.wakeValue).toBeNull();
    expect(fixture.confidence).toBe('unavailable');
    expect(fixture.wakeTimestamp).toBeNull();
    expect(fixture.caveat).toBeDefined();
  });

  it('identity compactor round-trips the shape unchanged', () => {
    const compacted = compactors.get_body_battery_at_wake(fixture);
    expect(JSON.stringify(compacted)).toEqual(JSON.stringify(fixture));
  });
});

// ---------------------------------------------------------------------------
// get_body_battery_at_wake — longest-duration sleep event selection
// KAREN fix/wake-value-correctness follow-up (2026-05-05)
//
// Verifies the selection algorithm introduced in the BLOCKER fix:
//   - Two sleep events (nap + overnight): overnight (longer) must win
//   - Tie-break: latest end timestamp wins
//   - Single match: used directly
//   - Zero matches: falls back to estimated_from_lowest
// ---------------------------------------------------------------------------

/**
 * parseGmt: force Garmin "*Gmt" timestamp strings to UTC.
 * Garmin emits ISO-8601 without timezone suffix — JS would parse as local time.
 * Appending 'Z' forces UTC. Replicated from health.tools.ts for test isolation.
 */
function parseGmt(s: string): number {
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s).getTime();
  return new Date(s.replace(/\.\d+$/, '') + 'Z').getTime();
}

/**
 * Inline replica of the selection algorithm in health.tools.ts for isolated unit testing.
 * BB-1/BB-2/BB-3 fix: events are unwrapped (e.event ?? e), use durationInMilliseconds,
 * and compute end from parseGmt(eventStartTimeGmt) + durationInMilliseconds.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectLongestSleepEvent(rawEvents: any[]): any | undefined {
  // BB-1: unwrap nested event shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = rawEvents.map((e: any) => e?.event ?? e);
  const sleepEvents = events.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => typeof e?.eventType === 'string' && e.eventType.toLowerCase().includes('sleep'),
  );
  if (sleepEvents.length === 0) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return sleepEvents.reduce((best: any, candidate: any) => {
    // BB-2: use durationInMilliseconds (not durationInSeconds)
    const bestDurMs = best?.durationInMilliseconds ?? 0;
    const candDurMs = candidate?.durationInMilliseconds ?? 0;
    if (candDurMs > bestDurMs) return candidate;
    if (candDurMs === bestDurMs) {
      // BB-3: use parseGmt(eventStartTimeGmt) — forces UTC, not startTimestampGMT
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

describe('get_body_battery_at_wake — sleep event selection algorithm (real field names post BB-1/2/3)', () => {
  // Events use real upstream field names: eventStartTimeGmt + durationInMilliseconds.
  // The selectLongestSleepEvent function above unwraps e.event ?? e before filtering.
  const nap = {
    eventType: 'SLEEP',
    eventStartTimeGmt: '2026-05-05T15:00:00.000Z', // 8 AM PT nap start
    durationInMilliseconds: 3600000, // 1 hour in ms
  };
  const overnight = {
    eventType: 'sleep',  // lowercase variant — filter must be case-insensitive
    eventStartTimeGmt: '2026-05-05T04:00:00.000Z', // 9 PM PT prev night
    durationInMilliseconds: 34800000, // ~9.67 hours in ms → end = 13:40 UTC = 6:40 AM PT
  };
  const nonSleep = {
    eventType: 'ACTIVITY',
    eventStartTimeGmt: '2026-05-05T18:00:00.000Z',
    durationInMilliseconds: 7200000,
  };

  it('picks overnight over nap when overnight is longer', () => {
    const result = selectLongestSleepEvent([nap, overnight, nonSleep]);
    expect(result).toBe(overnight);
    // BB-2: real field is durationInMilliseconds (~9.67h in ms)
    expect(result.durationInMilliseconds).toBe(34800000);
  });

  it('picks overnight even when nap appears first in array', () => {
    // Array order must not determine winner — duration does
    const result = selectLongestSleepEvent([nap, overnight]);
    expect(result).toBe(overnight);
  });

  it('picks overnight even when overnight appears first in array', () => {
    const result = selectLongestSleepEvent([overnight, nap]);
    expect(result).toBe(overnight);
  });

  it('computes end from parseGmt(eventStartTimeGmt) + durationInMilliseconds for the selected event', () => {
    const result = selectLongestSleepEvent([nap, overnight]);
    // overnight: eventStartTimeGmt 04:00 UTC + 34800000ms (9.67h) = 13:40 UTC
    const computedEnd = parseGmt(result.eventStartTimeGmt) + result.durationInMilliseconds;
    expect(new Date(computedEnd).toISOString()).toBe('2026-05-05T13:40:00.000Z');
    // Confirm this is different from the nap's computed end (16:00 UTC)
    const napEnd = parseGmt(nap.eventStartTimeGmt) + nap.durationInMilliseconds;
    expect(computedEnd).not.toBe(napEnd);
  });

  it('single event is returned directly without error', () => {
    const result = selectLongestSleepEvent([overnight]);
    expect(result).toBe(overnight);
  });

  it('returns undefined when no sleep events present', () => {
    const result = selectLongestSleepEvent([nonSleep]);
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    const result = selectLongestSleepEvent([]);
    expect(result).toBeUndefined();
  });

  it('tie-break by latest computed end timestamp: later-ending event wins', () => {
    // Use 'Z' suffix so these parse correctly as UTC in both test and production code
    const earlyLong = {
      eventType: 'sleep',
      eventStartTimeGmt: '2026-05-05T01:00:00.000Z', // ends 09:00 UTC
      durationInMilliseconds: 28800000, // 8h in ms
    };
    const lateLong = {
      eventType: 'sleep',
      eventStartTimeGmt: '2026-05-05T03:00:00.000Z', // ends 11:00 UTC
      durationInMilliseconds: 28800000, // also 8h in ms, but later start → later end
    };
    const result = selectLongestSleepEvent([earlyLong, lateLong]);
    expect(result).toBe(lateLong);
    // Confirm by computing the end: parseGmt(03:00 UTC) + 8h = 11:00 UTC
    const computedEnd = parseGmt(result.eventStartTimeGmt) + result.durationInMilliseconds;
    expect(new Date(computedEnd).toISOString()).toBe('2026-05-05T11:00:00.000Z');
  });

  it('filters non-sleep events regardless of duration', () => {
    const longActivity = { eventType: 'ACTIVITY', durationInSeconds: 999999 };
    const result = selectLongestSleepEvent([longActivity, nap]);
    // nap must win even though longActivity has more seconds
    expect(result).toBe(nap);
  });
});

describe('COLOSSUS post-game compact token budget', () => {
  it('4-endpoint compact payload sum ≤ 4000 tokens (chars as proxy)', () => {
    const activityCompact = compactors.get_activity(activityTeamSportFull);
    const detailsCompact = compactors.get_activity_details(activityDetailsTeamSportFull);

    const hrZonesFull = {
      heartRateZones: [
        { zoneNumber: 1, zoneLowBoundary: 88, zoneHighBoundary: 110, secsInZone: 120, zoneMaxHR: 110, percentOfTimeInZone: 3.2 },
        { zoneNumber: 2, zoneLowBoundary: 110, zoneHighBoundary: 132, secsInZone: 480, zoneMaxHR: 132, percentOfTimeInZone: 12.9 },
        { zoneNumber: 3, zoneLowBoundary: 132, zoneHighBoundary: 154, secsInZone: 1440, zoneMaxHR: 154, percentOfTimeInZone: 38.7 },
        { zoneNumber: 4, zoneLowBoundary: 154, zoneHighBoundary: 176, secsInZone: 1240, zoneMaxHR: 176, percentOfTimeInZone: 33.3 },
        { zoneNumber: 5, zoneLowBoundary: 176, zoneHighBoundary: 220, secsInZone: 440, zoneMaxHR: 220, percentOfTimeInZone: 11.8 },
      ],
    };
    const hrZonesCompact = compactors.get_activity_hr_zones(hrZonesFull);

    const splitsFull = Array.from({ length: 4 }, (_, i) => ({
      splitSummaryNumber: i + 1,
      type: 'RWD_SOCCER_PHASE',
      distance: 1600.0,
      duration: 930.0,
      averageHR: 150 + i * 5,
      maxHR: 175 + i * 3,
      averageSpeed: 1.72,
      elevationGain: 3.0,
    }));
    const splitsCompact = compactors.get_activity_splits(splitsFull);

    const totalChars =
      byteLen(activityCompact) +
      byteLen(detailsCompact) +
      byteLen(hrZonesCompact) +
      byteLen(splitsCompact);

    // 4000 tokens × ~4 chars/token = 16,000 chars
    expect(totalChars).toBeLessThan(16000);
    // Should be well under 4000 actual chars
    expect(totalChars).toBeLessThan(4000);
  });
});

// ---------------------------------------------------------------------------
// Real-fixture tests — captured 2026-05-06 from Carlos's account
// These exist because both bugs shipped with hand-rolled fixtures; real fixtures
// catch field-name drift between Python/Node clients and actual upstream responses.
// ---------------------------------------------------------------------------

import bbEventFixture from './fixtures/garmin/get_body_battery_events.2026-05-06.carlos.json';
import bbValueFixture from './fixtures/garmin/get_body_battery.2026-05-06.carlos.json';
import trTodayFixture from './fixtures/garmin/get_training_readiness.2026-05-06.carlos.json';
import trMultiEntryFixture from './fixtures/garmin/get_training_readiness_range.2026-05-05.carlos.json';

// ---------------------------------------------------------------------------
// BB wake-event lookup — real fixture validates BB-1/2/3/4 fixes
// ---------------------------------------------------------------------------

describe('get_body_battery_at_wake — real fixture: BB field-name fixes (BB-1/2/3/4)', () => {
  it('BB-1: event wrapped in e.event — selectLongestSleepEvent finds SLEEP after unwrap', () => {
    // The real upstream shape: [{ event: { eventType, ... }, ... }]
    // BB-1 fix: unwrap e.event ?? e before filtering on eventType
    const result = selectLongestSleepEvent(bbEventFixture as any[]);
    expect(result).not.toBeUndefined();
    expect(result?.eventType).toBe('SLEEP');
  });

  it('BB-2: durationInMilliseconds present; no durationInSeconds in real fixture', () => {
    const result = selectLongestSleepEvent(bbEventFixture as any[]);
    expect(result?.durationInMilliseconds).toBe(27060000);
    expect(result?.durationInSeconds).toBeUndefined();
  });

  it('BB-3: eventStartTimeGmt present; no startTimestampGMT or endTimestampGMT in real fixture', () => {
    const result = selectLongestSleepEvent(bbEventFixture as any[]);
    expect(result?.eventStartTimeGmt).toBe('2026-05-06T06:19:07.0');
    expect(result?.startTimestampGMT).toBeUndefined();
    expect(result?.endTimestampGMT).toBeUndefined();
  });

  it('BB-3: sleep end computed as parseGmt(eventStartTimeGmt) + durationInMilliseconds = 13:50:07 UTC', () => {
    // eventStartTimeGmt "2026-05-06T06:19:07.0" is UTC (6:19 AM UTC = 11:19 PM PT bedtime).
    // parseGmt forces UTC parse; without it JS reads as local PT → 13:19 UTC (wrong).
    // 06:19:07 UTC + 27060000ms (7h31m) = 13:50:07 UTC = 6:50 AM PT (wake time).
    const result = selectLongestSleepEvent(bbEventFixture as any[]);
    const sleepEndMs = parseGmt(result.eventStartTimeGmt) + result.durationInMilliseconds;
    expect(new Date(sleepEndMs).toISOString()).toBe('2026-05-06T13:50:07.000Z');
  });

  it('wakeValue = 75: closest BB sample from get_body_battery to sleep end 13:50:07 UTC', () => {
    // Real upstream bodyBatteryValuesArray: [[ts, level], ...]
    // Sleep end: parseGmt("2026-05-06T06:19:07.0") + 27060000ms = 13:50:07 UTC
    // Candidates: 1778074920000=13:48:40 UTC (87s diff) vs 1778075460000=13:51:00 UTC (53s diff)
    // Winner: 1778075460000 (13:51:00 UTC), level 75
    const bbDay = (bbValueFixture as any[])[0];
    const valuesArray: Array<[number, number]> = bbDay.bodyBatteryValuesArray;
    const sleepEndMs = new Date('2026-05-06T13:50:07.000Z').getTime();
    let closest = valuesArray[0];
    let closestDiff = Math.abs(valuesArray[0][0] - sleepEndMs);
    for (const entry of valuesArray) {
      const diff = Math.abs(entry[0] - sleepEndMs);
      if (diff < closestDiff) { closestDiff = diff; closest = entry; }
    }
    expect(closest[1]).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// BB at-wake — sleep_data_fallback path (TARS 2026-05-07)
// Real fixture: Carlitos 2026-05-07 — get_body_battery_events returned [], the
// previous BB-4 logic bailed to confidence=unavailable. Root cause: async
// classification batch on Garmin's events endpoint backfills after raw wellness
// data lands; pre-9AM pulls can return [] for any account on any day (~8% miss
// rate over a 25-day sample). The wake BB is recoverable via getSleepData
// (dailySleepDTO.sleepEndTimestampGMT + sleepBodyBattery[] last-entry-≤-sleepEnd).
// This test exercises the same algorithm against the real captured fixture data.
// ---------------------------------------------------------------------------

/**
 * Inline replica of the sleep_data_fallback selection logic in health.tools.ts —
 * keeps the test isolated from the MCP server registration path while still
 * exercising the same algorithm against real fixture data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickWakeFromSleepData(sleep: any): { wakeTs: number | null; wakeValue: number | null } {
  const sleepEndTs: number | undefined = sleep?.dailySleepDTO?.sleepEndTimestampGMT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sleepBb: any[] = Array.isArray(sleep?.sleepBodyBattery) ? sleep.sleepBodyBattery : [];
  if (typeof sleepEndTs !== 'number' || sleepBb.length === 0) {
    return { wakeTs: null, wakeValue: null };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toEpochMs = (v: any): number | null => {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return null;
    if (v.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(v)) return new Date(v).getTime();
    const isoish = v.includes('T') ? v : v.replace(' ', 'T');
    return new Date(isoish.replace(/\.\d+$/, '') + 'Z').getTime();
  };
  let chosenTs: number | null = null;
  let chosenValue: number | null = null;
  for (const entry of sleepBb) {
    const ts = toEpochMs(entry?.startGMT);
    const val = entry?.value;
    if (ts == null || typeof val !== 'number') continue;
    if (ts <= sleepEndTs) {
      chosenTs = ts;
      chosenValue = val;
    }
  }
  return { wakeTs: chosenTs, wakeValue: chosenValue };
}

describe('get_body_battery_at_wake — sleep_data_fallback algorithm (Carlitos 2026-05-07 real fixture)', () => {
  // Fixture shape (Carlitos 2026-05-07): dailySleepDTO.sleepEndTimestampGMT is epoch ms (number),
  // sleepBodyBattery[].startGMT is epoch ms (number). Other accounts may emit string for startGMT;
  // toEpochMs handles both shapes.
  it('sleepEndTimestampGMT is a number (epoch ms fixture shape)', () => {
    expect(typeof (sleepDataCarlitos20260507 as any).dailySleepDTO.sleepEndTimestampGMT).toBe('number');
    expect((sleepDataCarlitos20260507 as any).dailySleepDTO.sleepEndTimestampGMT).toBe(1778161920000);
  });

  it('sleepBodyBattery is non-empty and last entry is the wake-instant value 92', () => {
    const arr = (sleepDataCarlitos20260507 as any).sleepBodyBattery as Array<{ startGMT: number; value: number }>;
    expect(arr.length).toBeGreaterThan(0);
    const last = arr[arr.length - 1];
    expect(last.startGMT).toBe(1778161860000);
    expect(last.value).toBe(92);
  });

  it('picks the last sleepBodyBattery entry whose startGMT ≤ sleepEndTimestampGMT', () => {
    const result = pickWakeFromSleepData(sleepDataCarlitos20260507);
    expect(result.wakeValue).toBe(92);
    expect(result.wakeTs).toBe(1778161860000);
    expect(new Date(result.wakeTs!).toISOString()).toBe('2026-05-07T13:51:00.000Z');
  });

  it('returns null wake when sleepBodyBattery array is empty', () => {
    const result = pickWakeFromSleepData({ dailySleepDTO: { sleepEndTimestampGMT: 1778161920000 }, sleepBodyBattery: [] });
    expect(result.wakeValue).toBeNull();
    expect(result.wakeTs).toBeNull();
  });

  it('returns null wake when sleepEndTimestampGMT is missing', () => {
    const result = pickWakeFromSleepData({ dailySleepDTO: {}, sleepBodyBattery: [{ startGMT: 1, value: 50 }] });
    expect(result.wakeValue).toBeNull();
    expect(result.wakeTs).toBeNull();
  });

  it('handles string startGMT shape ("YYYY-MM-DD HH:mm:ss") — adult-account fallback compat', () => {
    // Adult Garmin accounts emit startGMT as a GMT date string, not epoch ms.
    // toEpochMs must force UTC parse; without 'Z' append JS would read as local time.
    const sleep = {
      dailySleepDTO: { sleepEndTimestampGMT: new Date('2026-05-07T13:52:00.000Z').getTime() },
      sleepBodyBattery: [
        { startGMT: '2026-05-07 13:50:00', value: 90 },
        { startGMT: '2026-05-07 13:51:00', value: 92 },
        { startGMT: '2026-05-07 13:53:00', value: 93 }, // after sleepEnd — must NOT win
      ],
    };
    const result = pickWakeFromSleepData(sleep);
    expect(result.wakeValue).toBe(92);
    expect(new Date(result.wakeTs!).toISOString()).toBe('2026-05-07T13:51:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// compactBodyBattery — currentValue addition (Bug 3)
// ---------------------------------------------------------------------------

describe('compactBodyBattery — currentValue and currentValueTimestamp (Bug 3 / real fixture)', () => {
  it('currentValue equals the last entry in bodyBatteryValuesArray', () => {
    const compact = compactors.get_body_battery(bbValueFixture as any);
    // Last entry in fixture: [1778075460000, 75]
    expect(compact.currentValue).toBe(75);
  });

  it('currentValueTimestamp is the ISO timestamp of the last entry', () => {
    const compact = compactors.get_body_battery(bbValueFixture as any);
    // Last entry in fixture: [1778075460000, 75] → 2026-05-06T13:51:00.000Z
    expect(compact.currentValueTimestamp).toBe('2026-05-06T13:51:00.000Z');
  });

  it('endOfDayValue is an alias for currentValue (both are the last array element)', () => {
    const compact = compactors.get_body_battery(bbValueFixture as any);
    expect(compact.endOfDayValue).toBe(compact.currentValue);
  });

  it('midnightValue is the first array element (00:00 boundary), distinct from currentValue', () => {
    const compact = compactors.get_body_battery(bbValueFixture as any);
    // First entry: [1778050800000, 27] — this is the 00:00 calendar boundary reading
    expect(compact.midnightValue).toBe(27);
    // currentValue must differ from midnightValue (BB is rising through the day)
    expect(compact.currentValue).not.toBe(compact.midnightValue);
  });

  it('currentValue and currentValueTimestamp are both present as fields', () => {
    const compact = compactors.get_body_battery(bbValueFixture as any);
    expect('currentValue' in compact).toBe(true);
    expect('currentValueTimestamp' in compact).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// compactTrainingReadiness — TR-1/2/3 real fixture tests
// ---------------------------------------------------------------------------

describe('compactTrainingReadiness — real fixture: single-entry bare array (TR-1)', () => {
  it('TR-1: handles bare array shape (no trainingReadinessDTOList wrapper)', () => {
    // Real upstream single-day call returns a bare array, not a wrapped object
    const compact = compactors.get_training_readiness(trTodayFixture as any);
    expect(compact).not.toBeNull();
    expect(compact.score).toBe(74);
  });

  it('TR-2: reads real field names with *FactorPercent suffix', () => {
    const compact = compactors.get_training_readiness(trTodayFixture as any);
    // Real upstream: sleepHistoryFactorPercent=57, NOT sleepHistoryFactor
    expect(compact.sleepHistoryFactorPercent).toBe(57);
    expect(compact.recoveryTimeFactorPercent).toBe(99);
    expect(compact.hrvFactorPercent).toBe(67);
    // acwrFactorPercent (acute:chronic workload ratio) — NOT acuteLoadFactor
    expect(compact.acwrFactorPercent).toBe(100);
    expect(compact.stressHistoryFactorPercent).toBe(98);
  });

  it('core fields correct for 2026-05-06 real data: score=74, level=MODERATE, feedback=MOD_HRV_UNBALANCED', () => {
    const compact = compactors.get_training_readiness(trTodayFixture as any);
    expect(compact.score).toBe(74);
    expect(compact.level).toBe('MODERATE');
    expect(compact.feedbackLong).toBe('MOD_HRV_UNBALANCED');
    expect(compact.hrvWeeklyAverage).toBe(27);
  });

  it('TR-3 metadata fields exposed: inputContext and validSleep', () => {
    const compact = compactors.get_training_readiness(trTodayFixture as any);
    expect(compact.inputContext).toBe('AFTER_WAKEUP_RESET');
    expect(compact.validSleep).toBe(true);
  });
});

describe('compactTrainingReadiness — real fixture: multi-entry range (TR-3 selection rule)', () => {
  it('TR-1: handles range {date, data: [...]} wrapper shape', () => {
    // get_training_readiness_range returns [{date, data: [...dtos]}]
    // compactTrainingReadinessRange passes each entry.data to compactTrainingReadiness
    const rangeEntry = (trMultiEntryFixture as any[])[0];
    const compact = compactors.get_training_readiness(rangeEntry as any);
    expect(compact).not.toBeNull();
  });

  it('TR-3: picks AFTER_WAKEUP_RESET + validSleep=true entry from 4-entry 2026-05-05 day', () => {
    // 4 entries on 2026-05-05:
    //   [0] AFTER_POST_EXERCISE_RESET, validSleep=true, score=65 ← should NOT win
    //   [1] AFTER_WAKEUP_RESET, validSleep=true, score=66 ← should WIN
    //   [2] AFTER_WAKEUP_RESET, validSleep=false, score=75 ← has right context but no valid sleep
    //   [3] UPDATE_REALTIME_VARIABLES, validSleep=false, score=80 ← should NOT win
    const rangeEntry = (trMultiEntryFixture as any[])[0];
    const compact = compactors.get_training_readiness(rangeEntry as any);
    expect(compact.score).toBe(66);
    expect(compact.inputContext).toBe('AFTER_WAKEUP_RESET');
    expect(compact.validSleep).toBe(true);
  });

  it('TR-3: does NOT pick the highest score (score is not the selection criterion)', () => {
    const rangeEntry = (trMultiEntryFixture as any[])[0];
    const compact = compactors.get_training_readiness(rangeEntry as any);
    // score=80 (UPDATE_REALTIME_VARIABLES) would win if score were the criterion
    expect(compact.score).not.toBe(80);
    // score=75 (AFTER_WAKEUP_RESET + validSleep=false) would win if validSleep wasn't checked
    expect(compact.score).not.toBe(75);
  });
});
