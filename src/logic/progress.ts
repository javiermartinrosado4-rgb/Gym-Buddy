import { AppState, Exercise, Workout } from "../types";
import { allExercises } from "./routine";
export interface ChartPoint { date: string; value: number; detail?: string }
export const eligibleForScore = (e: Exercise) => !e.custom && (e.variant === "free" || e.scoreEligible === true);
export function exerciseProgress(history: Workout[], id: string): ChartPoint[] {
  return [...history].sort((a, b) => a.date.localeCompare(b.date)).flatMap(w => {
    const sets = w.records.filter(r => r.prescription.exerciseId === id).flatMap(r => r.sets);
    const best = sets.filter(s => s.weight > 0 && s.reps > 0).sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    return best ? [{ date: w.date, value: best.weight, detail: `${best.reps} rep · peso corporal ${w.bodyWeight ?? "sin registrar"} kg` }] : [];
  });
}
export function scoreProgress(state: AppState): { points: ChartPoint[]; exercises: string[] } {
  const eligible = new Set(allExercises(state.preferences).filter(eligibleForScore).map(e => e.id));
  const history = [...state.history].sort((a, b) => a.date.localeCompare(b.date));
  const exercises = [...new Set(history.filter(w => Number.isFinite(w.bodyWeight) && w.bodyWeight! > 0)
    .flatMap(w => w.records.filter(r => eligible.has(r.prescription.exerciseId) && r.sets.some(s => s.weight > 0 && s.reps > 0)).map(r => r.prescription.exerciseId)))];
  const ratios = new Map<string, number>();
  const points: ChartPoint[] = [];
  for (const w of history) {
    if (!Number.isFinite(w.bodyWeight) || w.bodyWeight! <= 0) continue;
    let changed = false;
    for (const r of w.records) {
      const loads = r.sets.filter(s => s.weight > 0 && s.reps > 0).map(s => s.weight);
      if (!eligible.has(r.prescription.exerciseId) || !loads.length) continue;
      ratios.set(r.prescription.exerciseId, Math.max(...loads) / w.bodyWeight!);
      changed = true;
    }
    // Use one fixed exercise cohort for the displayed series; additions do not create artificial jumps.
    if (changed && exercises.length && exercises.every(id => ratios.has(id))) {
      points.push({ date: w.date, value: Math.round(1000 * exercises.reduce((sum, id) => sum + ratios.get(id)!, 0) / exercises.length) / 10 });
    }
  }
  return { points, exercises };
}
export function bodyWeightProgress(state: AppState): ChartPoint[] {
  return [
    ...(state.bodyWeights ?? []).map(p => ({ date: p.date, value: p.weight })),
    ...state.history.filter(w => Number.isFinite(w.bodyWeight) && w.bodyWeight! > 0).map(w => ({ date: w.date, value: w.bodyWeight! })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
