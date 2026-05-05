/**
 * tool-names.ts — hand-maintained string-literal union of every registered tool name.
 *
 * KAREN Phase 2 (2026-05-02):
 *   Per design §10.1: ToolName is a string-literal union used to type the compactors Record.
 *   Adding a new tool to a register*Tools file without adding it here is a compile error
 *   (Record<ToolName, Compactor> is exhaustive). The inverse (removing a tool without updating
 *   this file) is caught by the unit test in test/tool-names.test.ts.
 *
 *   Hand-maintained per KAREN cost call (cheaper than a codegen step). Sync this file
 *   whenever a new tool is added to any register*Tools file.
 */

// Activity tools (activities.tools.ts)
export const ACTIVITY_TOOL_NAMES = [
  'get_activities',
  'get_activities_by_date',
  'get_last_activity',
  'count_activities',
  'get_activity',
  'get_activity_details',
  'get_activity_splits',
  'get_activity_weather',
  'get_activity_hr_zones',
  'get_activity_exercise_sets',
  'get_activity_gear',
  'get_activity_types',
  'get_activity_typed_splits',
  'get_activity_split_summaries',
  'get_activity_power_in_timezones',
  'get_progress_summary',
] as const;

// Health/daily tools (health.tools.ts)
export const HEALTH_TOOL_NAMES = [
  'get_daily_summary',
  'get_steps',
  'get_steps_chart',
  'get_heart_rate',
  'get_resting_heart_rate',
  'get_stress',
  'get_body_battery',
  'get_body_battery_events',
  'get_body_battery_at_wake',
  'get_respiration',
  'get_spo2',
  'get_intensity_minutes',
  'get_floors',
  'get_hydration',
  'get_daily_events',
] as const;

// Trend tools (trends.tools.ts)
export const TREND_TOOL_NAMES = [
  'get_daily_steps_range',
  'get_weekly_steps',
  'get_weekly_stress',
  'get_weekly_intensity_minutes',
] as const;

// Sleep tools (sleep.tools.ts)
export const SLEEP_TOOL_NAMES = [
  'get_sleep_data',
  'get_sleep_data_raw',
] as const;

// Body composition tools (body.tools.ts)
export const BODY_TOOL_NAMES = [
  'get_body_composition',
  'get_latest_weight',
  'get_daily_weigh_ins',
  'get_weigh_ins',
  'get_blood_pressure',
] as const;

// Performance tools (performance.tools.ts)
export const PERFORMANCE_TOOL_NAMES = [
  'get_vo2max',
  'get_training_readiness',
  'get_training_status',
  'get_hrv',
  'get_endurance_score',
  'get_hill_score',
  'get_race_predictions',
  'get_fitness_age',
  'get_personal_records',
  'get_lactate_threshold',
  'get_cycling_ftp',
] as const;

// Profile/device tools (profile.tools.ts)
export const PROFILE_TOOL_NAMES = [
  'get_user_profile',
  'get_user_settings',
  'get_devices',
  'get_device_settings',
  'get_device_last_used',
  'get_primary_training_device',
  'get_device_solar_data',
  'get_gear',
  'get_gear_activities',
  'get_gear_defaults',
  'get_gear_stats',
  'get_goals',
  'get_earned_badges',
  'get_workouts',
  'get_workout',
] as const;

// Range tools (range.tools.ts)
export const RANGE_TOOL_NAMES = [
  'get_sleep_data_range',
  'get_hrv_range',
  'get_stress_range',
  'get_spo2_range',
  'get_respiration_range',
  'get_training_readiness_range',
  'get_vo2max_range',
] as const;

// Snapshot tools (snapshot.tools.ts)
export const SNAPSHOT_TOOL_NAMES = [
  'get_daily_health_snapshot',
] as const;

// Training/plan tools (training.tools.ts)
export const TRAINING_TOOL_NAMES = [
  'get_training_plans',
  'get_training_plan_by_id',
  'get_adaptive_training_plan_by_id',
  'get_scheduled_workout_by_id',
] as const;

// Wellness tools (wellness.tools.ts)
export const WELLNESS_TOOL_NAMES = [
  'get_menstrual_calendar_data',
  'get_menstrual_data_for_date',
  'get_pregnancy_summary',
  'get_lifestyle_logging_data',
] as const;

// Challenge tools (challenges.tools.ts)
export const CHALLENGE_TOOL_NAMES = [
  'get_available_badges',
  'get_adhoc_challenges',
  'get_badge_challenges',
  'get_available_badge_challenges',
  'get_non_completed_badge_challenges',
  'get_inprogress_virtual_challenges',
] as const;

// Write tools (write.tools.ts)
export const WRITE_TOOL_NAMES = [
  'set_activity_name',
  'set_blood_pressure',
  'set_hydration',
  'add_weigh_in',
  'add_gear_to_activity',
  'remove_gear_from_activity',
  'create_manual_activity',
  'delete_activity',
] as const;

// Combined union of all tool names
export const TOOL_NAMES = [
  ...ACTIVITY_TOOL_NAMES,
  ...HEALTH_TOOL_NAMES,
  ...TREND_TOOL_NAMES,
  ...SLEEP_TOOL_NAMES,
  ...BODY_TOOL_NAMES,
  ...PERFORMANCE_TOOL_NAMES,
  ...PROFILE_TOOL_NAMES,
  ...RANGE_TOOL_NAMES,
  ...SNAPSHOT_TOOL_NAMES,
  ...TRAINING_TOOL_NAMES,
  ...WELLNESS_TOOL_NAMES,
  ...CHALLENGE_TOOL_NAMES,
  ...WRITE_TOOL_NAMES,
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];
