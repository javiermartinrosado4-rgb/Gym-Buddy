import { ActiveWorkout, AppState, Day, Level, Prescription, Workout } from "../types";
import { progression } from "./progression";
import { getExercise } from "./routine";
import { localDateKey } from "./schedule";
import { number } from "./validation";
export const draftFor = (p: Prescription) =>
  Array.from({ length: p.sets }, () => ({
    weight: String(p.weight),
    reps: "",
  }));
export function startWorkout(day: Day, bodyWeight?: string, level?: Level): ActiveWorkout {
  if (!day.exercises.length) throw new Error("La sesión no tiene ejercicios.");
  const draft = draftFor(day.exercises[0]);
  return {
    level,
    bodyWeight: bodyWeight ? number(bodyWeight) : undefined,
    day: {
      ...day,
      exercises: day.exercises.map((p): Prescription => ({
        ...p,
        range: [...p.range],
      })),
    },
    index: 0,
    startedAt: new Date().toISOString(),
    records: [],
    draft,
    drafts: { [day.exercises[0].id]: draft },
    skipped: [],
  };
}
export const isActiveWorkoutOnDate = (active: ActiveWorkout | undefined, date = new Date()) =>
  !!active && localDateKey(active.startedAt) === localDateKey(date);
export function finishWorkout(s: AppState, workout: Workout): AppState {
  if (s.history.some(w => w.id === workout.id || (workout.startedAt && w.startedAt === workout.startedAt))) return { ...s, active: undefined };
  let next: AppState = { ...s, active: undefined, history: [...s.history, workout] };
  for (const r of workout.records) {
    if (!r.sets.length) continue;
    const e = getExercise(r.prescription.exerciseId, s.preferences);
    const result = progression(r.type, r.prescription.range, r.sets, r.prescription.sets,
      s.preferences.loadSteps?.[e.id] ?? e.loadStep);
    next = confirmWeight(next, e.id, result.increase ? result.suggested : r.sets.at(-1)!.weight);
  }
  return next;
}
// Refresh untouched exercises on resume while preserving all entered work.
export function resumeWorkout(s: AppState): ActiveWorkout | undefined {
  const active = s.active;
  // An unfinished session belongs to the calendar date on which it started.
  // A later day's plan must never resume it as today's workout.
  if (!active || !isActiveWorkoutOnDate(active) || s.history.some(w => w.startedAt === active.startedAt)) return undefined;
  const current = s.routine.find(d => d.id === active.day.id)
    ?? s.routine.find(d => d.name === active.day.name)
    ?? s.routine
      .map(day => ({ day, overlap: day.exercises.filter(entry => active.day.exercises.some(item => item.exerciseId === entry.exerciseId)).length }))
      .sort((a, b) => b.overlap - a.overlap)[0]?.day;
  const drafts = { ...active.drafts, [active.day.exercises[active.index].id]: active.draft };
  const exercises = active.day.exercises.map(entry => {
    const planned = current?.exercises.find(p => p.id === entry.id && p.exerciseId === entry.exerciseId)
      ?? current?.exercises.find(p => p.exerciseId === entry.exerciseId);
    // The current routine is always authoritative for the number of effective
    // sets. Calendar overrides preserve a load, never an obsolete set count.
    const next = { ...entry, sets: planned?.sets ?? entry.sets };
    const previous = drafts[entry.id] ?? active.records.find(r => r.prescription.id === entry.id)?.sets.map(set => ({ weight: String(set.weight), reps: String(set.reps) })) ?? [];
    drafts[entry.id] = draftFor(next).map((blank, i) => previous[i] ?? blank);
    return next;
  });
  return { ...active, day: { ...active.day, exercises }, drafts, draft: drafts[exercises[active.index].id] };
}

export function confirmWeight(
  s: AppState,
  exerciseId: string,
  weight: number,
): AppState {
  return {
    ...s,
    preferences: {
      ...s.preferences,
      weights: { ...s.preferences.weights, [exerciseId]: weight },
    },
    routine: s.routine.map((d) => ({
      ...d,
      exercises: d.exercises.map((p) =>
        p.exerciseId === exerciseId ? { ...p, weight } : p,
      ),
    })),
  };
}
