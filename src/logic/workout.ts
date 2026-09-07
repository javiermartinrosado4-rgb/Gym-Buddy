import { ActiveWorkout, AppState, Day, Prescription, Workout } from "../types";
import { progression } from "./progression";
import { getExercise } from "./routine";
import { number } from "./validation";
export const draftFor = (p: Prescription) =>
  Array.from({ length: p.sets }, () => ({
    weight: String(p.weight),
    reps: "",
  }));
export function startWorkout(day: Day, bodyWeight?: string): ActiveWorkout {
  const draft = draftFor(day.exercises[0]);
  return {
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
export function finishWorkout(s: AppState, workout: Workout): AppState {
  let next: AppState = { ...s, active: undefined, history: [...s.history, workout] };
  for (const r of workout.records) {
    const e = getExercise(r.prescription.exerciseId, s.preferences);
    const result = progression(r.type, r.prescription.range, r.sets, r.prescription.sets,
      s.preferences.loadSteps?.[e.id] ?? e.loadStep);
    next = confirmWeight(next, e.id, result.increase ? result.suggested : r.sets.at(-1)!.weight);
  }
  return next;
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
