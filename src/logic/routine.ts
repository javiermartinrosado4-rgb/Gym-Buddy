import { APP } from "../config";
import { catalog } from "../data/catalog";
import { levelRank } from "../data/options";
import {
  Day,
  Exercise,
  Muscle,
  Level,
  Preferences,
  Prescription,
  Profile,
} from "../types";
export const allExercises = (prefs: Preferences) => [
  ...catalog,
  ...prefs.custom,
];
export const getExercise = (id: string, prefs: Preferences) =>
  allExercises(prefs).find((e) => e.id === id)!;
export const displayName = (id: string, prefs: Preferences) =>
  prefs.names[id] || getExercise(id, prefs)?.name || "Ejercicio";
export function candidates(
  muscle: Muscle,
  profile: Profile,
  prefs: Preferences,
  compound = false,
): Exercise[] {
  return allExercises(prefs)
    .filter(
      (e) =>
        e.muscle === muscle &&
        levelRank[e.minLevel] <= levelRank[profile.level] &&
        prefs.equipment.includes(e.variant) &&
        !prefs.unavailable.includes(e.id),
    )
    .sort(
      (a, b) =>
        (compound
          ? Number(b.type === "compound") - Number(a.type === "compound")
          : 0) ||
        a.priority - b.priority ||
        (profile.level === "beginner"
          ? Number(b.variant === "machine") - Number(a.variant === "machine")
          : 0),
    );
}
export function prescribe(
  e: Exercise,
  prefs: Preferences,
  id = e.id,
): Prescription {
  return {
    id,
    exerciseId: e.id,
    sets: APP.defaultSets,
    range: prefs.ranges[e.id] ?? [...e.range],
    weight: prefs.weights[e.id] ?? 0,
  };
}
export const restSeconds = (e: Exercise) => (e.type === "compound" ? 300 : 180);
export const exerciseLimit = (level: Level) => level === "beginner" ? 5 : 6;
export const heavyExerciseLimit = (days: number) => (days > 3 ? 2 : Infinity);
export const isHeavyExercise = (exercise: Exercise) => exercise.type === "compound";
export function heavyExerciseCount(day: Day, prefs: Preferences) {
  return day.exercises.filter((p) => isHeavyExercise(getExercise(p.exerciseId, prefs))).length;
}
export function canPlaceExercise(
  day: Day,
  exercise: Exercise,
  prefs: Preferences,
  days: number,
  replacingId?: string,
) {
  if (!isHeavyExercise(exercise)) return true;
  const existing = day.exercises.filter((p) => p.id !== replacingId);
  return existing.filter((p) => isHeavyExercise(getExercise(p.exerciseId, prefs))).length < heavyExerciseLimit(days);
}
export function duration(day: Day, prefs: Preferences): number {
  if (!day.exercises.length) return 0;
  // Six minutes of general warm-up, 2 minutes for setup / approach sets per exercise,
  // up to five seconds per repetition and recovery after every effective set.
  return Math.ceil(
    6 +
      day.exercises.reduce(
        (sum, p) =>
          sum +
          2 +
          (p.sets *
            (p.range[1] * 5 + restSeconds(getExercise(p.exerciseId, prefs)))) /
            60,
        0,
      ),
  );
}
export function fitDay(day: Day, prefs: Preferences, preserveId?: string, level: Level = "intermediate"): Day {
  const exercises = [...day.exercises];
  while (
    exercises.length > exerciseLimit(level)
  ) {
    const index = exercises.findLastIndex((e) => e.id !== preserveId);
    if (index < 0) break;
    exercises.splice(index, 1);
  }
  return { ...day, exercises };
}
const upper: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps"];
const lower: Muscle[] = ["quads", "hamstrings", "glutes", "calves"];

export const glutesEnabled = (p: Profile) => p.includeGlutes ?? (p.sex === "female" || p.priority === "glutes");
export function weeklyTargets(p: Profile): Record<Muscle, number> {
  const large = p.level === "beginner" ? 6 : 8;
  const targets: Record<Muscle, number> = {
    chest: 4, shoulders: 4, biceps: 4, triceps: 4, calves: 4,
    back: large, quads: large, hamstrings: large,
    glutes: glutesEnabled(p) ? large + (p.sex === "female" ? 2 : 0) : 0,
  };
  if (p.mesocycle && p.level === "advanced" && p.priority !== "balanced") targets[p.priority] = 16;
  return targets;
}
export function weeklyVolume(routine: Day[], prefs: Preferences): Record<Muscle, number> {
  const result = Object.fromEntries([...upper, ...lower].map(m => [m, 0])) as Record<Muscle, number>;
  for (const day of routine) for (const p of day.exercises) result[getExercise(p.exerciseId, prefs).muscle] += p.sets;
  return result;
}
export function orderExercises(entries: Prescription[], prefs: Preferences): Prescription[] {
  const remaining = [...entries];
  const ordered: Prescription[] = [];
  while (remaining.length) {
    const previous = ordered.at(-1);
    const muscle = previous && getExercise(previous.exerciseId, prefs).muscle;
    // Prefer a different primary muscle; within that group, heavy movements first.
    remaining.sort((a, b) => {
      const ea = getExercise(a.exerciseId, prefs), eb = getExercise(b.exerciseId, prefs);
      return Number(ea.muscle === muscle) - Number(eb.muscle === muscle)
        || Number(eb.type === "compound") - Number(ea.type === "compound");
    });
    ordered.push(remaining.shift()!);
  }
  return ordered;
}
export function generateRoutine(profile: Profile, prefs: Preferences): Day[] {
  const count = Math.min(APP.maxDays, Math.max(1, profile.days));
  const targets = weeklyTargets(profile);
  // Keep the familiar day names/split, but allocate volume without silently trimming for time.
  const names = [
    [], ["Full body"], ["Full body A", "Full body B"],
    ["Torso", "Pierna", "Full body"],
    ["Torso A", "Pierna A", "Torso B", "Pierna B"],
    ["Torso", "Pierna", "Torso", "Pierna", "Especialización"],
  ][count];
  const days: Day[] = names.map((name, i) => ({ id: `day-${i}`, name, exercises: [] }));
  const torsoDays = days.filter((day) => day.name.startsWith("Torso"));
  const used: Partial<Record<Muscle, number>> = {};
  let lastPull: Exercise["pullPattern"] = "vertical";
  const allowed = (day: Day, muscle: Muscle) => {
    const isSpecialization = profile.mesocycle && profile.level === "advanced" && profile.priority === muscle;
    if (isSpecialization) return true;
    if (count > 3 && (muscle === "biceps" || muscle === "triceps") && profile.priority !== muscle) {
      const torsoIndex = torsoDays.findIndex((torso) => torso.id === day.id);
      return muscle === "biceps" ? torsoIndex === 0 : torsoIndex === 1;
    }
    return count <= 2 || day.name.startsWith("Full") || day.name === "Especialización" || (day.name.startsWith("Torso") ? upper : lower).includes(muscle);
  };
  const add = (day: Day, muscle: Muscle) => {
    let options = candidates(muscle, profile, prefs, true).filter(e =>
      !day.exercises.some(p => p.exerciseId === e.id) &&
      canPlaceExercise(day, e, prefs, count),
    );
    if (muscle === "back") options = options.sort((a, b) => Number(b.pullPattern !== lastPull && !!b.pullPattern) - Number(a.pullPattern !== lastPull && !!a.pullPattern));
    // In 4–5 day plans reserve the two heavy slots for the chest/back work.
    // Hombro can still be trained hard when it is the stated priority.
    if (count > 3 && muscle === "shoulders" && profile.priority !== "shoulders")
      options = options.sort((a, b) => Number(b.type === "isolation") - Number(a.type === "isolation"));
    if (muscle === "hamstrings" && (used[muscle] ?? 0) % 2 === 1) {
      options = options.sort((a, b) => Number(b.id === "seated-curl") - Number(a.id === "seated-curl"));
    }
    const e = options[0];
    if (!e) return false;
    day.exercises.push(prescribe(e, prefs, `${day.id}-${e.id}`));
    used[muscle] = (used[muscle] ?? 0) + 1;
    if (e.pullPattern) lastPull = e.pullPattern;
    return true;
  };
  const muscles: Muscle[] = ["quads", "chest", "back", "hamstrings", "glutes", "shoulders", "calves", "biceps", "triceps"];
  if (profile.priority !== "balanced") muscles.sort((a, b) => Number(b === profile.priority) - Number(a === profile.priority));
  if (profile.mesocycle && profile.level === "advanced" && profile.priority !== "balanced") {
    for (const day of days.slice(0, 3)) add(day, profile.priority);
  }
  // Cover each group first. Repeated rounds distribute exposure across the week.
  for (let round = 0; round < 8; round++) {
    let changed = false;
    for (const muscle of muscles) {
      if (targets[muscle] <= (used[muscle] ?? 0) * 2) continue;
      const possible = days.filter(d => allowed(d, muscle) && d.exercises.length < exerciseLimit(profile.level));
      possible.sort((a, b) =>
        a.exercises.filter(p => getExercise(p.exerciseId, prefs).muscle === muscle).length - b.exercises.filter(p => getExercise(p.exerciseId, prefs).muscle === muscle).length
        || a.exercises.length - b.exercises.length);
      for (const day of possible) if (add(day, muscle)) { changed = true; break; }
    }
    if (!changed) break;
  }
  // If exercise slots are exhausted, spread the remaining sets over existing exposures.
  for (const muscle of muscles) {
    const entries = days.flatMap(d => d.exercises).filter(p => getExercise(p.exerciseId, prefs).muscle === muscle);
    let remaining = targets[muscle] - entries.reduce((sum, p) => sum + p.sets, 0);
    while (remaining > 0 && entries.some(p => p.sets < 6)) {
      for (const p of entries) if (remaining > 0 && p.sets < 6) { p.sets++; remaining--; }
    }
  }
  return days.map(d => ({ ...d, exercises: orderExercises(d.exercises, prefs) }));
}
