import { Workout } from "../types";

// Gross energy estimate using Compendium 2024 categories 02052 (5 MET)
// and 02054 (3.5 MET). Model duration from completed reps and rests, so
// leaving a workout open overnight cannot inflate calories.
// https://pacompendium.com/adult-compendium/
export function estimateCalories(workout: Workout): number | null {
  if (!workout.records.some(r => r.sets.length)) return 0;
  const weight = workout.bodyWeight;
  if (!weight || !Number.isFinite(weight) || weight < 30 || weight > 350) return null;
  let metMinutes = 0;
  for (const record of workout.records) {
    const met = /squat|deadlift|rdl/.test(record.prescription.exerciseId) ? 5 : 3.5;
    for (const set of record.sets) {
      if (!Number.isFinite(set.reps) || set.reps <= 0) continue;
      const minutes = set.reps * 3 / 60 + (record.type === "compound" ? 5 : 3);
      metMinutes += met * minutes;
    }
  }
  return Math.round(metMinutes * 3.5 * weight / 200);
}
