/**
 * compactors.ts — per-tool compact output projections.
 *
 * KAREN Phase 2 (2026-05-02):
 *   Implements design §10 Compact Output Mode.
 *   Each compactor takes the full upstream payload and returns a smaller shape
 *   preserving the fields BAYMAX/COLOSSUS actually consume.
 *
 *   Design principles (§10.2):
 *   - Date fields: keep ISO strings, drop redundant localDate/gmtDate pairs
 *   - Numeric fields: preserve precision relevant to health insights
 *   - Drop: per-second/per-minute sensor arrays, internal Garmin IDs irrelevant to consumers,
 *     UI-only metadata, duplicate derived fields
 *   - Identity passthrough (~25 tools): write tools, device tools, gear tools, already-small
 *     queries, and get_sleep_data_raw (caller wants raw by definition)
 *
 *   Type safety: Record<ToolName, Compactor> — adding a new tool without adding an entry here
 *   is a TS compile error.
 */

import type { ToolName } from './tool-names.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Compactor = (full: any) => any;

/** Identity passthrough — used for tools where compaction would lose semantically important
 *  data, or tools where the raw payload is already small (<3 KB). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const identity: Compactor = (x: any) => x;

// ---------------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------------

/** get_sleep_data — ~50 KB → ~500 B (~98% reduction) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactSleepData: Compactor = (full: any) => ({
  date: full?.dailySleepDTO?.calendarDate ?? null,
  sleepScore: full?.dailySleepDTO?.sleepScores?.overall?.value ?? null,
  sleepDurationMinutes: Math.round((full?.dailySleepDTO?.sleepTimeSeconds ?? 0) / 60),
  deepMinutes: Math.round((full?.dailySleepDTO?.deepSleepSeconds ?? 0) / 60),
  remMinutes: Math.round((full?.dailySleepDTO?.remSleepSeconds ?? 0) / 60),
  lightMinutes: Math.round((full?.dailySleepDTO?.lightSleepSeconds ?? 0) / 60),
  awakeMinutes: Math.round((full?.dailySleepDTO?.awakeSleepSeconds ?? 0) / 60),
  restingHR: full?.restingHeartRate ?? null,
  avgRespiration: full?.avgRespiration ?? null,
  avgHRV: full?.avgOvernightHrv ?? null,
  bodyBatteryDelta: full?.bodyBatteryChange ?? null,
});

/** get_sleep_data_range — array of per-day sleep data. Each entry is the raw day object
 *  from the range call. Apply compactSleepData per element. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactSleepDataRange: Compactor = (full: any) => {
  if (!Array.isArray(full)) return full;
  return full.map((entry: any) => compactSleepData(entry?.data ?? entry));
};

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

/** Shared compact row shape for a single activity summary.
 *  Used by get_activities, get_activities_by_date, get_last_activity. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compactActivityRow(act: any): object {
  return {
    activityId: act?.activityId ?? null,
    activityName: act?.activityName ?? null,
    activityType: act?.activityType?.typeKey ?? act?.activityTypeDTO?.typeKey ?? null,
    startTimeLocal: act?.startTimeLocal ?? null,
    durationMinutes: act?.duration != null ? Math.round(act.duration / 60) : null,
    distanceKm: act?.distance != null ? Math.round(act.distance / 10) / 100 : null,
    avgHR: act?.averageHR ?? null,
    maxHR: act?.maxHR ?? null,
    calories: act?.calories ?? null,
    trainingEffectAerobic: act?.aerobicTrainingEffect ?? null,
    trainingEffectAnaerobic: act?.anaerobicTrainingEffect ?? null,
    trainingLoad: act?.activityTrainingLoad ?? null,
  };
}

/** get_activities — array, ~85% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactActivities: Compactor = (full: any) => {
  if (!Array.isArray(full)) return full;
  return full.map(compactActivityRow);
};

/** get_activities_by_date — same schema */
const compactActivitiesByDate = compactActivities;

/** get_last_activity — single row */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactLastActivity: Compactor = (full: any) => compactActivityRow(full);

/** get_activity — single activity with extra detail, ~80% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactActivity: Compactor = (full: any) => ({
  activityId: full?.activityId ?? null,
  activityName: full?.activityName ?? null,
  activityType: full?.activityType?.typeKey ?? full?.activityTypeDTO?.typeKey ?? null,
  startTimeLocal: full?.startTimeLocal ?? null,
  durationMinutes: full?.duration != null ? Math.round(full.duration / 60) : null,
  movingDurationMinutes: full?.movingDuration != null ? Math.round(full.movingDuration / 60) : null,
  distanceKm: full?.distance != null ? Math.round(full.distance / 10) / 100 : null,
  avgHR: full?.averageHR ?? null,
  maxHR: full?.maxHR ?? null,
  minHR: full?.minHR ?? null,
  calories: full?.calories ?? null,
  activeCalories: full?.activeKilocalories ?? null,
  trainingEffectAerobic: full?.aerobicTrainingEffect ?? null,
  trainingEffectAnaerobic: full?.anaerobicTrainingEffect ?? null,
  trainingEffectLabel: full?.trainingEffectLabel ?? null,
  trainingLoad: full?.activityTrainingLoad ?? null,
  vO2MaxValue: full?.vO2MaxValue ?? null,
  avgRunCadence: full?.avgRunCadence ?? null,
  avgPower: full?.avgPower ?? null,
  elevationGainMeters: full?.elevationGain ?? null,
  weatherTempC: full?.weatherTemperatureC ?? null,
  device: full?.deviceValue ?? null,
});

/** get_activity_details — strips per-second metric arrays, ~96% reduction.
 *  Callers needing per-second GPS/HR arrays should use verbose: true. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactActivityDetails: Compactor = (full: any) => {
  const act = full?.activityDetail?.activity ?? full?.activity ?? full;
  const metrics = full?.golfSummary ?? null; // structural sentinel
  const metricDescriptors = full?.metricDescriptors;
  const metrics_list = full?.metrics;

  // Summarize HR zone time from metrics if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hrZoneSeconds: number[] | null = null;
  if (Array.isArray(metricDescriptors) && Array.isArray(metrics_list)) {
    // HR zone fields are present in some activity types
    const hrIdx = metricDescriptors.findIndex(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d: any) => d?.metricsType === 'HEART_RATE_ZONE',
    );
    if (hrIdx >= 0 && metrics_list.length > 0) {
      // Sum seconds in each HR zone across all samples
      const zoneSums: Record<number, number> = {};
      for (const row of metrics_list) {
        const val = row?.metrics?.[hrIdx];
        if (val != null) {
          zoneSums[val] = (zoneSums[val] ?? 0) + 1; // 1 sample = 1 second typically
        }
      }
      hrZoneSeconds = [1, 2, 3, 4, 5].map((z) => zoneSums[z] ?? 0);
    }
  }

  void metrics; // not used in compact shape

  return {
    activityId: act?.activityId ?? full?.activityId ?? null,
    summaryFromActivity: compactActivity(act),
    metricSummary: {
      samplePeriodSeconds: full?.metricDescriptors?.[0]?.sampleLength ?? null,
      totalSamples: Array.isArray(metrics_list) ? metrics_list.length : null,
      hrZoneTimeSeconds: hrZoneSeconds,
      powerZoneTimeSeconds: null, // not extractable without zone boundaries
    },
    samplesAvailableViaVerbose: Array.isArray(metrics_list) && metrics_list.length > 0,
  };
};

/** get_activity_splits — array, ~75% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactActivitySplits: Compactor = (full: any) => {
  const splits = Array.isArray(full) ? full : full?.activitySplitSummaries ?? full?.splits ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return splits.map((s: any) => ({
    splitIndex: s?.splitSummaryNumber ?? s?.splitIndex ?? null,
    splitType: s?.type ?? s?.splitType ?? null,
    distanceKm: s?.distance != null ? Math.round(s.distance / 10) / 100 : null,
    durationMinutes: s?.duration != null ? Math.round(s.duration / 60 * 10) / 10 : null,
    avgHR: s?.averageHR ?? null,
    maxHR: s?.maxHR ?? null,
    avgPaceMinutesPerKm:
      s?.averageSpeed != null && s.averageSpeed > 0
        ? Math.round((1000 / s.averageSpeed / 60) * 10) / 10
        : null,
    elevationGainMeters: s?.elevationGain ?? null,
  }));
};

/** get_activity_typed_splits — same schema, keeps splitType discriminant */
const compactActivityTypedSplits = compactActivitySplits;

/** get_activity_split_summaries — same schema */
const compactActivitySplitSummaries = compactActivitySplits;

/** get_activity_hr_zones — ~50% reduction (strip UI metadata) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactActivityHrZones: Compactor = (full: any) => {
  const zones = Array.isArray(full)
    ? full
    : full?.heartRateZones ?? full?.zones ?? [];
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zones: zones.map((z: any, idx: number) => ({
      zone: z?.zoneNumber ?? idx + 1,
      lowHR: z?.zoneLowBoundary ?? null,
      highHR: z?.zoneHighBoundary ?? null,
      secondsInZone: z?.secsInZone ?? z?.secondsInZone ?? null,
    })),
  };
};

/** get_progress_summary — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactProgressSummary: Compactor = (full: any) => {
  const period = full?.period ?? full?.periodType ?? null;
  const activities = full?.activities ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byType: Record<string, any> = {};
  for (const a of activities) {
    const key = a?.activityType?.typeKey ?? 'unknown';
    byType[key] = {
      count: a?.numberOfActivities ?? null,
      totalDistanceKm: a?.totalDistance != null ? Math.round(a.totalDistance / 10) / 100 : null,
      totalDurationMinutes: a?.totalDuration != null ? Math.round(a.totalDuration / 60) : null,
    };
  }
  return {
    period,
    periodStart: full?.startDate ?? null,
    periodEnd: full?.endDate ?? null,
    totalActivities: full?.totalActivities ?? activities.length,
    totalDurationMinutes: full?.totalDuration != null ? Math.round(full.totalDuration / 60) : null,
    totalDistanceKm: full?.totalDistance != null ? Math.round(full.totalDistance / 10) / 100 : null,
    totalCalories: full?.totalCalories ?? null,
    byActivityType: byType,
  };
};

// ---------------------------------------------------------------------------
// Daily Health
// ---------------------------------------------------------------------------

/** get_daily_summary — ~80% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactDailySummary: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  totalSteps: full?.totalSteps ?? null,
  stepGoal: full?.dailyStepGoal ?? null,
  totalKilocalories: full?.totalKilocalories ?? null,
  activeKilocalories: full?.activeKilocalories ?? null,
  floorsAscended: full?.floorsAscended ?? null,
  minHeartRate: full?.minHeartRate ?? null,
  maxHeartRate: full?.maxHeartRate ?? null,
  restingHeartRate: full?.restingHeartRateValue ?? null,
  averageStressLevel: full?.averageStressLevel ?? null,
  maxStressLevel: full?.maxStressLevel ?? null,
  stressDurationMinutes: full?.stressDuration != null ? Math.round(full.stressDuration / 60) : null,
  bodyBatteryHighestValue: full?.bodyBatteryHighestValue ?? null,
  bodyBatteryLowestValue: full?.bodyBatteryLowestValue ?? null,
  totalDistanceMeters: full?.totalDistanceMeters ?? null,
  moderateIntensityMinutes: full?.moderateIntensityMinutes ?? null,
  vigorousIntensityMinutes: full?.vigorousIntensityMinutes ?? null,
});

/** get_steps — compact: just the essential step fields (~95% reduction) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactSteps: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  totalSteps: full?.totalSteps ?? null,
  stepGoal: full?.dailyStepGoal ?? null,
  distanceMeters: full?.totalDistanceMeters ?? null,
  activeMinutes:
    (full?.moderateIntensityMinutes ?? 0) + (full?.vigorousIntensityMinutes ?? 0) || null,
});

/** get_steps_chart — array of step buckets, ~60% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactStepsChart: Compactor = (full: any) => {
  const items = Array.isArray(full) ? full : full?.stepsDataDTOList ?? full?.items ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any) => ({
    startTimestamp: item?.startGMT ?? item?.startTimestampGMT ?? null,
    steps: item?.steps ?? null,
  }));
};

/** get_heart_rate — ~98% reduction (drop per-2-min HR samples array) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactHeartRate: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  restingHR: full?.restingHeartRate ?? null,
  minHR: full?.minHeartRate ?? null,
  maxHR: full?.maxHeartRate ?? null,
  averageHR: full?.heartRateValues ? null : (full?.averageHR ?? null), // can't compute easily without samples
  lastSevenDaysAvgRestingHR: full?.lastSevenDaysAvgRestingHR ?? null,
});

/** get_resting_heart_rate — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactRestingHeartRate: Compactor = (full: any) => ({
  date:
    full?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE?.[0]?.calendarDate ??
    full?.calendarDate ??
    null,
  restingHR:
    full?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE?.[0]?.value ??
    full?.restingHeartRate ??
    null,
  weeklyAvg: full?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE_WEEKLY_AVG?.[0]?.value ?? null,
  monthlyAvg: full?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE_MONTHLY_AVG?.[0]?.value ?? null,
});

/** get_stress — ~96% reduction (drop per-3-min stress samples) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactStress: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  averageStressLevel: full?.avgStressLevel ?? null,
  maxStressLevel: full?.maxStressLevel ?? null,
  restStressMinutes: full?.restStressDuration != null ? Math.round(full.restStressDuration / 60) : null,
  lowStressMinutes: full?.lowStressDuration != null ? Math.round(full.lowStressDuration / 60) : null,
  mediumStressMinutes: full?.mediumStressDuration != null ? Math.round(full.mediumStressDuration / 60) : null,
  highStressMinutes: full?.highStressDuration != null ? Math.round(full.highStressDuration / 60) : null,
});

/** get_body_battery — ~95% reduction (drop per-3-min samples) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactBodyBattery: Compactor = (full: any) => {
  const items = Array.isArray(full) ? full : [full];
  if (items.length === 0) return null;
  // Body battery endpoint can return an array; take the last (most recent) day's summary
  const day = items[items.length - 1];
  const charged = Array.isArray(day?.bodyBatteryValuesArray)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? day.bodyBatteryValuesArray.filter((v: any) => v?.[2] > 0).reduce((s: number, v: any) => s + v[2], 0)
    : null;
  const drained = Array.isArray(day?.bodyBatteryValuesArray)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? Math.abs(day.bodyBatteryValuesArray.filter((v: any) => v?.[2] < 0).reduce((s: number, v: any) => s + v[2], 0))
    : null;
  const values = Array.isArray(day?.bodyBatteryValuesArray)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? day.bodyBatteryValuesArray.map((v: any) => v?.[1]).filter((v: any) => v != null)
    : [];
  return {
    date: day?.date ?? null,
    wakeValue: values.length > 0 ? values[0] : null,
    highestValue: values.length > 0 ? Math.max(...values) : null,
    lowestValue: values.length > 0 ? Math.min(...values) : null,
    endOfDayValue: values.length > 0 ? values[values.length - 1] : null,
    chargedTotal: charged,
    drainedTotal: drained,
  };
};

/** get_body_battery_events — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactBodyBatteryEvents: Compactor = (full: any) => {
  const events = Array.isArray(full) ? full : full?.events ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return events.map((e: any) => ({
    timestamp: e?.startTimestampGMT ?? e?.timestamp ?? null,
    eventType: e?.eventType ?? null,
    bodyBatteryDelta: e?.bodyBatteryDelta ?? null,
    durationMinutes: e?.durationInSeconds != null ? Math.round(e.durationInSeconds / 60) : null,
  }));
};

/** get_respiration — ~95% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactRespiration: Compactor = (full: any) => ({
  date: full?.startTimestampGMT?.split('T')?.[0] ?? full?.calendarDate ?? null,
  avgRespiration: full?.avgWakingRespirationValue ?? full?.avgRespiration ?? null,
  lowestRespiration: full?.lowestRespirationValue ?? null,
  highestRespiration: full?.highestRespirationValue ?? null,
  sleepAvgRespiration: full?.avgSleepRespirationValue ?? null,
});

/** get_spo2 — ~85% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactSpo2: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  avgSpo2: full?.averageSpO2 ?? null,
  lowestSpo2: full?.lowestSpO2 ?? null,
  sleepAvgSpo2: full?.avgSleepSpO2 ?? null,
});

/** get_intensity_minutes — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactIntensityMinutes: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  moderateMinutes: full?.moderateIntensityMinutes ?? null,
  vigorousMinutes: full?.vigorousIntensityMinutes ?? null,
});

/** get_floors — ~60% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactFloors: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  floorsAscended: full?.floorsAscended ?? null,
  floorsDescended: full?.floorsDescended ?? null,
  goal: full?.floorsAscendedGoal ?? null,
});

/** get_daily_events — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactDailyEvents: Compactor = (full: any) => {
  const events = Array.isArray(full) ? full : full?.events ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return events.map((e: any) => ({
    date: e?.calendarDate ?? e?.date ?? null,
    eventType: e?.eventType ?? null,
    summary: e?.eventSummary ?? e?.summary ?? null,
  }));
};

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

/** get_daily_steps_range — ~90% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactDailyStepsRange: Compactor = (full: any) => {
  const items = Array.isArray(full) ? full : full?.allMetrics?.metricsMap?.WELLNESS_TOTAL_STEPS ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any) => ({
    date: item?.calendarDate ?? item?.date ?? null,
    totalSteps: item?.value ?? item?.totalSteps ?? null,
    stepGoal: item?.stepGoal ?? null,
  }));
};

/** get_weekly_steps — ~80% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactWeeklySteps: Compactor = (full: any) => {
  const items = Array.isArray(full) ? full : full?.allMetrics?.metricsMap?.WELLNESS_TOTAL_STEPS ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any) => ({
    date: item?.calendarDate ?? null,
    totalSteps: item?.value ?? null,
    stepGoal: item?.stepGoal ?? null,
  }));
};

/** get_weekly_stress — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactWeeklyStress: Compactor = (full: any) => ({
  weekStart: full?.startDate ?? null,
  averageStressLevel: full?.avgWeeklyStress ?? null,
  weeklyTrend: full?.stressTrend ?? null,
  highStressDays: full?.highStressDays ?? null,
});

/** get_weekly_intensity_minutes — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactWeeklyIntensityMinutes: Compactor = (full: any) => ({
  weekStart: full?.startDate ?? null,
  moderateMinutes: full?.weeklyModerateIntensityMinutes ?? null,
  vigorousMinutes: full?.weeklyVigorousIntensityMinutes ?? null,
  weeklyGoalMinutes: full?.weeklyGoal ?? null,
  weeklyTotalMinutes:
    (full?.weeklyModerateIntensityMinutes ?? 0) + (full?.weeklyVigorousIntensityMinutes ?? 0) || null,
});

// ---------------------------------------------------------------------------
// HRV
// ---------------------------------------------------------------------------

/** get_hrv — ~85% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactHrv: Compactor = (full: any) => {
  const hrv = full?.hrvSummary ?? full;
  return {
    date: hrv?.calendarDate ?? null,
    weeklyAvg: hrv?.weeklyAvg ?? null,
    lastNightAvg: hrv?.lastNightAvg ?? null,
    lastNightStatus: hrv?.lastNightStatus ?? null,
    baseline: hrv?.baseline
      ? {
          lowUpper: hrv.baseline.lowUpper ?? null,
          balancedLower: hrv.baseline.balancedLower ?? null,
          balancedUpper: hrv.baseline.balancedUpper ?? null,
          markerValue: hrv.baseline.markerValue ?? null,
        }
      : null,
  };
};

/** get_hrv_range — array of get_hrv compact rows, ~98% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactHrvRange: Compactor = (full: any) => {
  if (!Array.isArray(full)) return full;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return full.map((entry: any) => compactHrv(entry?.data ?? entry));
};

// ---------------------------------------------------------------------------
// Body Composition
// ---------------------------------------------------------------------------

/** get_body_composition — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactBodyComposition: Compactor = (full: any) => {
  const dto = full?.totalAverage ?? full?.bodyCompositionDTO ?? full;
  return {
    date: dto?.startDate ?? dto?.calendarDate ?? null,
    weightKg: dto?.weight != null ? Math.round(dto.weight * 10) / 10 : null,
    bmi: dto?.bmi != null ? Math.round(dto.bmi * 10) / 10 : null,
    bodyFatPercent: dto?.bodyFatPercentage != null ? Math.round(dto.bodyFatPercentage * 10) / 10 : null,
    bodyWaterPercent: dto?.bodyWaterPercentage != null ? Math.round(dto.bodyWaterPercentage * 10) / 10 : null,
    boneMassKg: dto?.boneMass != null ? Math.round(dto.boneMass * 10) / 10 : null,
    muscleMassKg: dto?.muscleMass != null ? Math.round(dto.muscleMass * 10) / 10 : null,
    physiqueRating: dto?.physiqueRating ?? null,
    visceralFat: dto?.visceralFat ?? null,
    metabolicAgeYears: dto?.metabolicAge ?? null,
  };
};

/** get_weigh_ins — ~80% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactWeighIns: Compactor = (full: any) => {
  const items = Array.isArray(full) ? full : full?.dailyWeightSummaries ?? full?.items ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any) => ({
    date: item?.calendarDate ?? item?.date ?? null,
    weightKg: item?.totalAverage?.weight != null
      ? Math.round(item.totalAverage.weight * 10) / 10
      : (item?.weight != null ? Math.round(item.weight * 10) / 10 : null),
    bodyFatPercent: item?.totalAverage?.bodyFatPercentage != null
      ? Math.round(item.totalAverage.bodyFatPercentage * 10) / 10
      : null,
    bmi: item?.totalAverage?.bmi != null ? Math.round(item.totalAverage.bmi * 10) / 10 : null,
  }));
};

/** get_daily_weigh_ins — same row schema, single date */
const compactDailyWeighIns = compactWeighIns;

/** get_latest_weight — ~60% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactLatestWeight: Compactor = (full: any) => {
  // getDailyWeighIns returns array — take most recent entry
  const items = Array.isArray(full) ? full : [full];
  if (items.length === 0) return null;
  const item = items[items.length - 1];
  const avg = item?.totalAverage ?? item;
  return {
    date: item?.calendarDate ?? null,
    weightKg: avg?.weight != null ? Math.round(avg.weight * 10) / 10 : null,
    bodyFatPercent: avg?.bodyFatPercentage != null ? Math.round(avg.bodyFatPercentage * 10) / 10 : null,
    bmi: avg?.bmi != null ? Math.round(avg.bmi * 10) / 10 : null,
    source: avg?.weightInScale != null ? 'scale' : 'manual',
  };
};

/** get_blood_pressure — ~60% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactBloodPressure: Compactor = (full: any) => {
  const items = Array.isArray(full)
    ? full
    : full?.bloodPressureSummaries ?? full?.items ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((bp: any) => ({
    measurementDate: bp?.measurementTimestampGMT ?? bp?.measurementDate ?? null,
    systolic: bp?.systolic ?? null,
    diastolic: bp?.diastolic ?? null,
    pulse: bp?.pulse ?? null,
    source: bp?.sourceType ?? null,
  }));
};

// ---------------------------------------------------------------------------
// Performance & Training
// ---------------------------------------------------------------------------

/** get_training_readiness — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactTrainingReadiness: Compactor = (full: any) => {
  const dto = full?.trainingReadinessDTOList?.[0] ?? full?.trainingReadinessDTO ?? full;
  return {
    date: dto?.calendarDate ?? null,
    score: dto?.score ?? null,
    level: dto?.level ?? null,
    feedbackLong: dto?.feedbackLong ?? null,
    sleepScore: dto?.sleepScore ?? null,
    sleepHistoryFactor: dto?.sleepHistoryFactor ?? null,
    recoveryTimeFactor: dto?.recoveryTimeFactor ?? null,
    hrvFactor: dto?.hrvFactor ?? null,
    hrvWeeklyAverage: dto?.hrvWeeklyAverage ?? null,
    acuteLoadFactor: dto?.acuteLoadFactor ?? null,
    stressHistoryFactor: dto?.stressHistoryFactor ?? null,
  };
};

/** get_training_readiness_range — ~85% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactTrainingReadinessRange: Compactor = (full: any) => {
  if (!Array.isArray(full)) return full;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return full.map((entry: any) => compactTrainingReadiness(entry?.data ?? entry));
};

/** get_training_status — ~80% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactTrainingStatus: Compactor = (full: any) => {
  const dto = full?.trainingStatusDTO ?? full;
  return {
    date: dto?.latestActivityStartTimeGMT?.split('T')?.[0] ?? null,
    trainingStatus: dto?.trainingStatus ?? null,
    vo2MaxRunning: dto?.mostRecentVO2Max?.generic ?? dto?.vo2MaxRunning ?? null,
    vo2MaxCycling: dto?.mostRecentVO2Max?.cycling ?? dto?.vo2MaxCycling ?? null,
    weeklyTrainingLoad: dto?.weekly7DayTrainingLoad ?? null,
    loadRatio: dto?.trainingLoadBalance?.weeklyTrainingLoadToTargetRatio ?? null,
    loadFocus: dto?.trainingLoadBalance
      ? {
          anaerobic: dto.trainingLoadBalance.highAerobicAndAnaerobicPercent ?? null,
          highAerobic: dto.trainingLoadBalance.highAerobicPercent ?? null,
          lowAerobic: dto.trainingLoadBalance.lowAerobicPercent ?? null,
        }
      : null,
    fitnessAge: null, // fetch separately via get_fitness_age
  };
};

/** get_vo2max — ~50% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactVo2Max: Compactor = (full: any) => {
  const dto = full?.userVO2MaxDTOList?.[0] ?? full;
  return {
    date: dto?.calendarDate ?? null,
    vo2MaxRunning: dto?.vo2MaxValue ?? dto?.vo2MaxRunning ?? null,
    vo2MaxCycling: dto?.vo2MaxCyclingValue ?? dto?.vo2MaxCycling ?? null,
    fitnessAge: dto?.fitnessAge ?? null,
  };
};

/** get_vo2max_range — ~80% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactVo2MaxRange: Compactor = (full: any) => {
  if (!Array.isArray(full)) return full;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return full.map((entry: any) => compactVo2Max(entry?.data ?? entry));
};

/** get_hrv_range — already defined above */

/** get_endurance_score — ~50% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactEnduranceScore: Compactor = (full: any) => {
  const dto = full?.enduranceScoreDTO ?? full;
  return {
    date: dto?.calendarDate ?? null,
    overallScore: dto?.overallEnduranceScore ?? dto?.score ?? null,
    level: dto?.enduranceScoreLevel ?? dto?.level ?? null,
    contributor: dto?.enduranceScoreContributorDTOList?.[0]?.contributorValue ?? null,
  };
};

/** get_hill_score — ~50% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactHillScore: Compactor = (full: any) => {
  const dto = full?.hillScoreDTO ?? full;
  return {
    date: dto?.calendarDate ?? null,
    overallScore: dto?.overallHillScore ?? null,
    hikingAbilityLevel: dto?.hikingAbilityLevel ?? null,
    hikingAbilityDescription: dto?.hikingAbilityDescription ?? null,
  };
};

/** get_lactate_threshold — ~50% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactLactateThreshold: Compactor = (full: any) => {
  const dto = full?.lactateThresholdDTO ?? full;
  return {
    date: dto?.calendarDate ?? null,
    heartRateLT: dto?.heartRate ?? null,
    speedKmh: dto?.speed != null ? Math.round(dto.speed * 3.6 * 10) / 10 : null,
    paceMinutesPerKm:
      dto?.speed != null && dto.speed > 0
        ? Math.round((1000 / dto.speed / 60) * 10) / 10
        : null,
  };
};

/** get_race_predictions — ~50% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactRacePredictions: Compactor = (full: any) => {
  const dto = full?.racePredictions ?? full;
  if (Array.isArray(dto)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return dto.map((p: any) => ({
      date: p?.calendarDate ?? null,
      fiveK: p?.time5K ?? null,
      tenK: p?.time10K ?? null,
      halfMarathon: p?.timeHalfMarathon ?? null,
      marathon: p?.timeMarathon ?? null,
    }));
  }
  return {
    fiveK: dto?.time5K ?? null,
    tenK: dto?.time10K ?? null,
    halfMarathon: dto?.timeHalfMarathon ?? null,
    marathon: dto?.timeMarathon ?? null,
  };
};

/** get_fitness_age — ~50% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactFitnessAge: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  fitnessAge: full?.biologicalAge ?? full?.fitnessAge ?? null,
  chronologicalAge: full?.chronologicalAge ?? null,
});

/** get_personal_records — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactPersonalRecords: Compactor = (full: any) => {
  const records = Array.isArray(full) ? full : full?.personalRecords ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return records.map((r: any) => ({
    recordType: r?.activityType ?? r?.typeId ?? null,
    value: r?.value ?? null,
    activityId: r?.activityId ?? null,
    date: r?.prStartTimeGMT?.split('T')?.[0] ?? null,
  }));
};

/** get_cycling_ftp — ~50% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactCyclingFtp: Compactor = (full: any) => ({
  date: full?.calendarDate ?? null,
  ftpWatts: full?.ftpValue ?? full?.ftp ?? null,
  source: full?.ftpSource ?? null,
});

// ---------------------------------------------------------------------------
// Range tools (delegates to per-day compactors)
// ---------------------------------------------------------------------------

/** get_stress_range — array of get_stress compact rows */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactStressRange: Compactor = (full: any) => {
  if (!Array.isArray(full)) return full;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return full.map((entry: any) => compactStress(entry?.data ?? entry));
};

/** get_spo2_range — array of get_spo2 compact rows, ~95% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactSpo2Range: Compactor = (full: any) => {
  if (!Array.isArray(full)) return full;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return full.map((entry: any) => compactSpo2(entry?.data ?? entry));
};

/** get_respiration_range — array of get_respiration compact rows */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactRespirationRange: Compactor = (full: any) => {
  if (!Array.isArray(full)) return full;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return full.map((entry: any) => compactRespiration(entry?.data ?? entry));
};

// ---------------------------------------------------------------------------
// Health Snapshot
// ---------------------------------------------------------------------------

/** get_daily_health_snapshot — ~75% reduction.
 *  Snapshot is already aggregated; drop per-minute sub-arrays within each metric. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactDailyHealthSnapshot: Compactor = (full: any) => ({
  date: full?.date ?? null,
  restingHR: full?.heartRate?.restingHeartRate ?? full?.summary?.restingHeartRate ?? null,
  rhrTrend: full?.heartRate?.restingHRTrend ?? null,
  avgStress: full?.stress?.averageStressLevel ?? full?.summary?.averageStressLevel ?? null,
  stressTrend: full?.stress?.stressTrend ?? null,
  bodyBatteryStart: full?.bodyBattery?.startValue ?? null,
  bodyBatteryEnd: full?.bodyBattery?.endValue ?? null,
  avgRespiration: full?.respiration?.avgWakingRespirationValue ?? null,
  spo2Avg: full?.spo2?.averageSpO2 ?? null,
  skinTempDeltaC: full?.skinTemp?.skinTemperatureDelta ?? null,
});

// ---------------------------------------------------------------------------
// Training Plans
// ---------------------------------------------------------------------------

/** get_training_plans — ~80% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactTrainingPlans: Compactor = (full: any) => {
  const plans = Array.isArray(full) ? full : full?.trainingPlans ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return plans.map((p: any) => ({
    planId: p?.trainingPlanId ?? p?.planId ?? null,
    planName: p?.trainingPlanName ?? p?.planName ?? null,
    startDate: p?.startDate ?? null,
    endDate: p?.endDate ?? null,
    daysCompleted: p?.completedWorkouts ?? null,
    daysTotal: p?.totalWorkouts ?? null,
  }));
};

/** get_training_plan_by_id — single plan with weeks */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactTrainingPlanById: Compactor = (full: any) => {
  const p = full?.trainingPlan ?? full;
  return {
    planId: p?.trainingPlanId ?? p?.planId ?? null,
    planName: p?.trainingPlanName ?? p?.planName ?? null,
    startDate: p?.startDate ?? null,
    endDate: p?.endDate ?? null,
    daysCompleted: p?.completedWorkouts ?? null,
    daysTotal: p?.totalWorkouts ?? null,
    weeks: Array.isArray(p?.weeks)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? p.weeks.map((w: any) => ({
          weekIndex: w?.weekIndex ?? null,
          focus: w?.weekFocus ?? w?.focus ?? null,
          workoutCount: Array.isArray(w?.workouts) ? w.workouts.length : null,
        }))
      : null,
  };
};

/** get_adaptive_training_plan_by_id — same shape */
const compactAdaptiveTrainingPlanById = compactTrainingPlanById;

/** get_scheduled_workout_by_id — ~75% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactScheduledWorkoutById: Compactor = (full: any) => ({
  scheduledWorkoutId: full?.scheduledWorkoutId ?? null,
  calendarDate: full?.scheduledDate ?? full?.calendarDate ?? null,
  workoutId: full?.workout?.workoutId ?? full?.workoutId ?? null,
  workoutName: full?.workout?.workoutName ?? full?.workoutName ?? null,
});

// ---------------------------------------------------------------------------
// Workouts (profile.tools.ts)
// ---------------------------------------------------------------------------

/** get_workouts — ~80% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactWorkouts: Compactor = (full: any) => {
  const items = Array.isArray(full) ? full : full?.workouts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((w: any) => ({
    workoutId: w?.workoutId ?? null,
    workoutName: w?.workoutName ?? null,
    workoutType: w?.sportType?.sportTypeKey ?? w?.workoutType ?? null,
    estimatedDurationMinutes: w?.estimatedDurationInSeconds != null ? Math.round(w.estimatedDurationInSeconds / 60) : null,
    estimatedDistanceKm: w?.estimatedDistanceInMeters != null ? Math.round(w.estimatedDistanceInMeters / 10) / 100 : null,
    createdDate: w?.createdDate?.split('T')?.[0] ?? null,
  }));
};

/** get_workout — single workout + steps, ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactWorkout: Compactor = (full: any) => ({
  workoutId: full?.workoutId ?? null,
  workoutName: full?.workoutName ?? null,
  workoutType: full?.sportType?.sportTypeKey ?? null,
  estimatedDurationMinutes: full?.estimatedDurationInSeconds != null ? Math.round(full.estimatedDurationInSeconds / 60) : null,
  estimatedDistanceKm: full?.estimatedDistanceInMeters != null ? Math.round(full.estimatedDistanceInMeters / 10) / 100 : null,
  createdDate: full?.createdDate?.split('T')?.[0] ?? null,
  steps: Array.isArray(full?.workoutSegments?.[0]?.workoutSteps)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? full.workoutSegments[0].workoutSteps.map((s: any) => ({
        stepOrder: s?.stepOrder ?? null,
        type: s?.stepType?.stepTypeKey ?? null,
        durationSeconds: s?.endConditionValue ?? null,
        targetType: s?.targetType?.workoutTargetTypeKey ?? null,
        targetValue: s?.targetValue ?? null,
      }))
    : null,
});

// ---------------------------------------------------------------------------
// Goals & Challenges
// ---------------------------------------------------------------------------

/** get_goals — ~70% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactGoals: Compactor = (full: any) => {
  const goals = Array.isArray(full) ? full : full?.goals ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return goals.map((g: any) => ({
    goalType: g?.goalType ?? null,
    target: g?.goalTarget ?? g?.target ?? null,
    current: g?.currentValue ?? g?.current ?? null,
    period: g?.period ?? null,
  }));
};

/** get_earned_badges — ~75% reduction */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactEarnedBadges: Compactor = (full: any) => {
  const badges = Array.isArray(full) ? full : full?.badges ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return badges.map((b: any) => ({
    badgeName: b?.badgeKey ?? b?.badgeName ?? null,
    earnedDate: b?.badgeEarnedDate?.split('T')?.[0] ?? null,
    badgeCategory: b?.badgeCategory ?? null,
  }));
};

/** Shared compactor for badge/challenge list tools */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compactBadgeChallengeList: Compactor = (full: any) => {
  const items = Array.isArray(full) ? full : full?.items ?? full?.badgeChallenges ?? full?.challenges ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any) => ({
    name: item?.badgeName ?? item?.challengeName ?? item?.name ?? null,
    type: item?.badgeCategoryName ?? item?.challengeType ?? item?.type ?? null,
    progress: item?.currentView?.userJoined
      ? (item?.userProfileSource?.currentValue ?? null)
      : null,
    target: item?.badgeTarget ?? item?.targetValue ?? item?.target ?? null,
    deadline: item?.endDate ?? item?.deadline ?? null,
  }));
};

// ---------------------------------------------------------------------------
// The exhaustive compactors record
// ---------------------------------------------------------------------------

export const compactors: Record<ToolName, Compactor> = {
  // Activities
  get_activities: compactActivities,
  get_activities_by_date: compactActivitiesByDate,
  get_last_activity: compactLastActivity,
  count_activities: identity,
  get_activity: compactActivity,
  get_activity_details: compactActivityDetails,
  get_activity_splits: compactActivitySplits,
  get_activity_weather: identity,          // already small (1-3 KB)
  get_activity_hr_zones: compactActivityHrZones,
  get_activity_exercise_sets: identity,    // already small
  get_activity_gear: identity,             // already small
  get_activity_types: identity,            // small enumeration
  get_activity_typed_splits: compactActivityTypedSplits,
  get_activity_split_summaries: compactActivitySplitSummaries,
  get_activity_power_in_timezones: identity, // already small
  get_progress_summary: compactProgressSummary,

  // Daily Health
  get_daily_summary: compactDailySummary,
  get_steps: compactSteps,
  get_steps_chart: compactStepsChart,
  get_heart_rate: compactHeartRate,
  get_resting_heart_rate: compactRestingHeartRate,
  get_stress: compactStress,
  get_body_battery: compactBodyBattery,
  get_body_battery_events: compactBodyBatteryEvents,
  get_respiration: compactRespiration,
  get_spo2: compactSpo2,
  get_intensity_minutes: compactIntensityMinutes,
  get_floors: compactFloors,
  get_hydration: identity,                 // already small, no compaction value
  get_daily_events: compactDailyEvents,

  // Trends
  get_daily_steps_range: compactDailyStepsRange,
  get_weekly_steps: compactWeeklySteps,
  get_weekly_stress: compactWeeklyStress,
  get_weekly_intensity_minutes: compactWeeklyIntensityMinutes,

  // Sleep
  get_sleep_data: compactSleepData,
  get_sleep_data_raw: identity,            // deliberately raw — verbose flag has no effect

  // Body Composition
  get_body_composition: compactBodyComposition,
  get_latest_weight: compactLatestWeight,
  get_daily_weigh_ins: compactDailyWeighIns,
  get_weigh_ins: compactWeighIns,
  get_blood_pressure: compactBloodPressure,

  // Performance
  get_vo2max: compactVo2Max,
  get_training_readiness: compactTrainingReadiness,
  get_training_status: compactTrainingStatus,
  get_hrv: compactHrv,
  get_endurance_score: compactEnduranceScore,
  get_hill_score: compactHillScore,
  get_race_predictions: compactRacePredictions,
  get_fitness_age: compactFitnessAge,
  get_personal_records: compactPersonalRecords,
  get_lactate_threshold: compactLactateThreshold,
  get_cycling_ftp: compactCyclingFtp,

  // Profile & Devices (identity — all <4 KB, no UI-only bulk)
  get_user_profile: identity,
  get_user_settings: identity,
  get_devices: identity,
  get_device_settings: identity,
  get_device_last_used: identity,
  get_primary_training_device: identity,
  get_device_solar_data: identity,
  get_gear: identity,
  get_gear_activities: identity,
  get_gear_defaults: identity,
  get_gear_stats: identity,
  get_goals: compactGoals,
  get_earned_badges: compactEarnedBadges,
  get_workouts: compactWorkouts,
  get_workout: compactWorkout,

  // Range
  get_sleep_data_range: compactSleepDataRange,
  get_hrv_range: compactHrvRange,
  get_stress_range: compactStressRange,
  get_spo2_range: compactSpo2Range,
  get_respiration_range: compactRespirationRange,
  get_training_readiness_range: compactTrainingReadinessRange,
  get_vo2max_range: compactVo2MaxRange,

  // Snapshot
  get_daily_health_snapshot: compactDailyHealthSnapshot,

  // Training Plans
  get_training_plans: compactTrainingPlans,
  get_training_plan_by_id: compactTrainingPlanById,
  get_adaptive_training_plan_by_id: compactAdaptiveTrainingPlanById,
  get_scheduled_workout_by_id: compactScheduledWorkoutById,

  // Wellness (identity — never called for this household, but must exist for TS exhaustiveness)
  get_menstrual_calendar_data: identity,
  get_menstrual_data_for_date: identity,
  get_pregnancy_summary: identity,
  get_lifestyle_logging_data: identity,

  // Challenges
  get_available_badges: compactBadgeChallengeList,
  get_adhoc_challenges: compactBadgeChallengeList,
  get_badge_challenges: compactBadgeChallengeList,
  get_available_badge_challenges: compactBadgeChallengeList,
  get_non_completed_badge_challenges: compactBadgeChallengeList,
  get_inprogress_virtual_challenges: compactBadgeChallengeList,

  // Write tools (identity — small ack payloads)
  set_activity_name: identity,
  set_blood_pressure: identity,
  set_hydration: identity,
  add_weigh_in: identity,
  add_gear_to_activity: identity,
  remove_gear_from_activity: identity,
  create_manual_activity: identity,
  delete_activity: identity,
};
