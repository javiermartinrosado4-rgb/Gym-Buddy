import { defaultTrainingDays, weekdays } from "../data/options";
import { Day, Profile, Weekday, Workout } from "../types";

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

export const workoutsOnDate = (history: Workout[], date = new Date()) =>
  history.filter((workout) => localDateKey(workout.date) === localDateKey(date));
