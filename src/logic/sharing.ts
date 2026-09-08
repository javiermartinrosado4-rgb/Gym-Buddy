import { catalog } from "../data/catalog";
import { AppState, Day, Exercise, Preferences, Range } from "../types";

export interface SharedExercise {
  exerciseId: string;
  name: string;
  sets: number;
  range: Range;
  /** The creator's exercise-specific reminder. Never includes loads. */
  note?: string;
}

export interface SharedRoutineDay {
  name: string;
  exercises: SharedExercise[];
}

export interface SharedRoutine {
  version: 1;
  days: SharedRoutineDay[];
  /** Only custom movements used by this plan, so the receiver can import it. */
  customExercises: Exercise[];
}

export interface SharedProgress {
  version: 1;
  sessions: number;
  sets: number;
  updated: string;
  exercises: { id: string; name: string; weight: number; reps: number; date: string }[];
}

const validCustomExercise = (value: unknown): value is Exercise => {
  if (!value || typeof value !== "object") return false;
  const exercise = value as Partial<Exercise>;
  return typeof exercise.id === "string" && exercise.id.length > 0 && exercise.id.length <= 80 &&
    typeof exercise.name === "string" && exercise.name.length > 0 && exercise.name.length <= 120 &&
    ["chest", "back", "shoulders", "biceps", "triceps", "glutes", "quads", "hamstrings", "calves", "abs"].includes(exercise.muscle ?? "") &&
    Array.isArray(exercise.secondary) && exercise.secondary.every(muscle => typeof muscle === "string") &&
    Number.isFinite(exercise.priority) && ["beginner", "intermediate", "advanced"].includes(exercise.minLevel ?? "") &&
    ["compound", "isolation"].includes(exercise.type ?? "") && typeof exercise.equipment === "string" &&
    ["machine", "free", "cable", "smith"].includes(exercise.variant ?? "") &&
    Array.isArray(exercise.range) && exercise.range.length === 2 && exercise.range.every(rep => Number.isInteger(rep) && rep >= 1 && rep <= 100) &&
    Array.isArray(exercise.substitutions) && exercise.substitutions.every(id => typeof id === "string") &&
    (exercise.note === undefined || (typeof exercise.note === "string" && exercise.note.length <= 300));
};

export function exportRoutine(routine: Day[], preferences: Preferences): SharedRoutine {
  const exerciseIds = new Set(routine.flatMap(day => day.exercises.map(item => item.exerciseId)));
  return {
    version: 1,
    days: routine.map(day => ({
      name: day.name,
      exercises: day.exercises.map(item => ({
        exerciseId: item.exerciseId,
        name: preferences.names[item.exerciseId] ||
          preferences.custom.find(exercise => exercise.id === item.exerciseId)?.name ||
          catalog.find(exercise => exercise.id === item.exerciseId)?.name || "Ejercicio",
        sets: item.sets,
        range: [...item.range] as Range,
        note: preferences.notes?.[item.exerciseId],
      })),
    })),
    customExercises: preferences.custom.filter(exercise => exerciseIds.has(exercise.id)),
  };
}

export function isSharedRoutine(value: unknown): value is SharedRoutine {
  if (!value || typeof value !== "object") return false;
  const routine = value as Partial<SharedRoutine>;
  const { days, customExercises } = routine;
  if (routine.version !== 1 || !Array.isArray(days) || !Array.isArray(customExercises)) return false;
  return days.every(day => day && typeof day.name === "string" && Array.isArray(day.exercises) &&
      day.exercises.every(exercise => exercise && typeof exercise.exerciseId === "string" &&
        typeof exercise.name === "string" && Number.isInteger(exercise.sets) && exercise.sets >= 1 && exercise.sets <= 6 &&
        Array.isArray(exercise.range) && exercise.range.length === 2 && exercise.range.every(rep => Number.isInteger(rep) && rep >= 1 && rep <= 100) &&
        (exercise.note === undefined || (typeof exercise.note === "string" && exercise.note.length <= 300)))),
    customExercises.every(validCustomExercise);
}

/** Imports the plan structure, deliberately resetting every load to zero. */
export function importRoutine(shared: SharedRoutine, preferences: Preferences): { routine: Day[]; preferences: Preferences } {
  const known = new Set([...catalog, ...preferences.custom].map(exercise => exercise.id));
  const custom = [
    ...preferences.custom,
    ...shared.customExercises.filter(exercise => !known.has(exercise.id)),
  ];
  const notes = { ...preferences.notes };
  for (const day of shared.days) for (const exercise of day.exercises) {
    // Personal notes take precedence; otherwise retain the creator's cue.
    if (!notes[exercise.exerciseId] && exercise.note) notes[exercise.exerciseId] = exercise.note;
  }
  return {
    routine: shared.days.map((day, dayIndex) => ({
      id: `shared-day-${dayIndex}`,
      name: day.name,
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        id: `shared-${dayIndex}-${exerciseIndex}`,
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        range: [...exercise.range] as Range,
        weight: 0,
      })),
    })),
    preferences: { ...preferences, custom, notes },
  };
}

/** A compact opt-in snapshot: current best logged set for each exercise, not full history. */
export function exportProgress(state: Pick<AppState, "history">): SharedProgress {
  const latest = new Map<string, { id: string; name: string; weight: number; reps: number; date: string }>();
  let sets = 0;
  for (const workout of state.history) for (const record of workout.records) {
    sets += record.sets.length;
    const best = record.sets.filter(set => set.weight > 0 && set.reps > 0)
      .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    if (best) latest.set(record.prescription.exerciseId, {
      id: record.prescription.exerciseId, name: record.name, weight: best.weight, reps: best.reps, date: workout.date,
    });
  }
  return {
    version: 1,
    sessions: state.history.length,
    sets,
    updated: new Date().toISOString(),
    exercises: [...latest.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
  };
}

export function isSharedProgress(value: unknown): value is SharedProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<SharedProgress>;
  const { sessions, sets, updated, exercises } = progress;
  return progress.version === 1 && typeof sessions === "number" && Number.isInteger(sessions) && sessions >= 0 &&
    typeof sets === "number" && Number.isInteger(sets) && sets >= 0 && typeof updated === "string" &&
    Number.isFinite(Date.parse(updated)) && Array.isArray(exercises) && exercises.length <= 30 &&
    exercises.every(exercise => exercise && typeof exercise.id === "string" && typeof exercise.name === "string" &&
      Number.isFinite(exercise.weight) && exercise.weight >= 0 && exercise.weight <= 1000 && Number.isInteger(exercise.reps) &&
      exercise.reps >= 1 && exercise.reps <= 100 && typeof exercise.date === "string" && Number.isFinite(Date.parse(exercise.date)));
}
