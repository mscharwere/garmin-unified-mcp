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
    expect('wakeValue' in compact).toBe(true);
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

  it('get_training_readiness reduces bytes by ≥30%', () => {
    const full = {
      trainingReadinessDTOList: [
        {
          calendarDate: '2026-04-26',
          score: 79,
          level: 'GOOD',
          feedbackLong: 'Your body is ready for a moderate effort.',
          sleepScore: 79,
          sleepHistoryFactor: 1,
          recoveryTimeFactor: 1,
          hrvFactor: 0,
          hrvWeeklyAverage: 52,
          acuteLoadFactor: -1,
          stressHistoryFactor: 0,
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
        },
      ],
    };
    const compact = compactors.get_training_readiness(full);
    expect(byteRatio(compact, full)).toBeLessThan(TOLERANCE);
    expect(compact.score).toBe(79);
    expect(compact.level).toBe('GOOD');
    expect(compact.hrvWeeklyAverage).toBe(52);
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
      trainingReadinessDTOList: [{
        calendarDate: '2026-04-26',
        score: 79,
        level: 'GOOD',
        feedbackLong: 'Your body is ready for a moderate effort.',
        sleepScore: 79,
        sleepHistoryFactor: 1,
        recoveryTimeFactor: 1,
        hrvFactor: 0,
        hrvWeeklyAverage: 52,
        acuteLoadFactor: -1,
        stressHistoryFactor: 0,
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
