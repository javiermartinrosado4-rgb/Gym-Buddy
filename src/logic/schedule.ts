import { defaultTrainingDays, weekdays } from "../data/options";
import { Day, PlannedWorkout, Profile, Weekday, Workout } from "../types";

export const isoWeekday = (date: Date): Weekday =>
  (date.getDay() === 0 ? 7 : date.getDay()) as Weekday;

export const localDateKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const availableWeekdays = (profile: Profile) => {
  const chosen = profile.trainingDays;
  return chosen?.length === profile.days
    ? [...chosen].sort((a, b) => a - b)
    : defaultTrainingDays(profile.days);
};

export function scheduledWeekdays(profile: Profile, sessions: number): Weekday[] {
  const available = availableWeekdays(profile);
  if (sessions >= available.length) return available.slice(0, sessions);
  if (sessions <= 1) return [available[0]];
  return Array.from(
    new Set(
      Array.from({ length: sessions }, (_, index) =>
        available[Math.round((index * (available.length - 1)) / (sessions - 1))],
      ),
    ),
  );
}

export function routineSchedule(profile: Profile, routine: Day[]) {
  const days = scheduledWeekdays(profile, routine.length);
  return routine.map((day, index) => ({ day, weekday: days[index] }));
}

export const weekdayName = (day: Weekday) =>
  weekdays.find((option) => option.id === day)?.name ?? "";

export function scheduledDay(
  profile: Profile,
  routine: Day[],
  date = new Date(),
) {
  return routineSchedule(profile, routine).find(
    (item) => item.weekday === isoWeekday(date),
  )?.day;
}

export function scheduledWorkout(
  profile: Profile,
  routine: Day[],
  planned: PlannedWorkout[] | undefined,
  date = new Date(),
  skippedDates?: string[],
) {
  const key = localDateKey(date);
  if (skippedDates?.includes(key)) return undefined;
  const override = planned?.find(item => localDateKey(item.date) === key);
  const base = scheduledDay(profile, routine, date);
  if (!override) return base;
  // Date-specific plans keep their chosen loads, while the current routine remains
  // the source of truth for sets and ranges. This prevents old saved overrides
  // from reviving an outdated four-set prescription.
  const source = base?.id === override.day.id
    ? base
    : routine.find(day => day.id === override.dayId || day.id === override.day.id);
  if (source) {
    return {
      ...override.day,
      exercises: source.exercises.map(entry => {
        const saved = override.day.exercises.find(item => item.id === entry.id && item.exerciseId === entry.exerciseId);
        return saved ? { ...entry, weight: saved.weight } : entry;
      }),
    };
  }
  return override.day;
}

export const startOfWeek = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - isoWeekday(start) + 1);
  return start;
};

export const datesForWeek = (date: Date) =>
  Array.from({ length: 7 }, (_, offset) => {
    const item = startOfWeek(date);
    item.setDate(item.getDate() + offset);
    return item;
  });

export const datesForMonth = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, offset) => {
    const item = new Date(start);
    item.setDate(start.getDate() + offset);
    return item;
  });
};

export const workoutsOnDate = (history: Workout[], date = new Date()) =>
  history.filter((workout) => localDateKey(workout.date) === localDateKey(date));

/** Consecutive completed scheduled sessions. A pending session today has until
 * the end of the day, so it does not reset an earned streak early. */
export function trainingStreak(
  profile: Profile,
  routine: Day[],
  history: Workout[],
  planned: PlannedWorkout[] | undefined,
  skippedDates: string[] | undefined,
  now = new Date(),
) {
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  const todayKey = localDateKey(cursor);
  let streak = 0;
  for (let checked = 0; checked < 366; checked++) {
    const plannedWorkout = scheduledWorkout(profile, routine, planned, cursor, skippedDates);
    if (plannedWorkout) {
      const complete = workoutsOnDate(history, cursor).some(workout =>
        workout.dayId === plannedWorkout.id ||
        (!workout.dayId && workout.dayName === plannedWorkout.name),
      );
      if (complete) streak++;
      else if (localDateKey(cursor) !== todayKey) break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
