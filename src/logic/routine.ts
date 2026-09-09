import { APP } from "../config";
import { catalog, formatExerciseName } from "../data/catalog";
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
  formatExerciseName(prefs.names[id] || getExercise(id, prefs)?.name || "Ejercicio");
export const movementFamily = (exercise: Exercise) => {
  if (exercise.muscle === "back" && exercise.pullPattern)
    return `back-${exercise.pullPattern}`;
  if (exercise.muscle === "chest" && exercise.type === "compound")
    return "chest-press";
  if (exercise.muscle === "shoulders" && exercise.type === "compound")
    return "shoulder-press";
  return undefined;
};
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
        a.priority - b.priority ||
        (profile.level === "advanced"
          ? Number(b.variant === "cable") - Number(a.variant === "cable")
          : 0) ||
        (compound
          ? Number(b.type === "compound") - Number(a.type === "compound")
          : 0) ||
        (profile.level === "beginner"
          ? Number(b.variant === "machine") - Number(a.variant === "machine")
          : 0),
    );
}
export function replacementCandidates(
  original: Exercise,
  profile: Profile,
  prefs: Preferences,
): Exercise[] {
  const family = movementFamily(original);
  return candidates(original.muscle, profile, prefs)
    .filter(exercise => exercise.id !== original.id)
    .map((exercise, index) => ({ exercise, index }))
    .sort((a, b) =>
      Number(movementFamily(b.exercise) === family) -
        Number(movementFamily(a.exercise) === family) ||
      Number(b.exercise.type === original.type) - Number(a.exercise.type === original.type) ||
      a.index - b.index,
    )
    .map(({ exercise }) => exercise);
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
export const restSeconds = (e: Exercise) => (e.type === "compound" ? 240 : 180);
export const exerciseLimit = (level: Level) => level === "beginner" ? 5 : 6;
export const heavyExerciseLimit = (days: number) => (days > 3 ? 2 : Infinity);
export const isHeavyExercise = (exercise: Exercise) => exercise.type === "compound";
export const isFullBodyDay = (day: Day) => day.name.startsWith("Full body");
// Full-body sessions are deliberately kept below the fatigue of a full split:
// three multi-joint lifts at most, with the rest of the work kept lighter.
export const automaticHeavyExerciseLimit = (day: Day, days: number) =>
  isFullBodyDay(day) ? 3 : heavyExerciseLimit(days);
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
  // Effective sets take around 30 seconds. Rest is counted between sets only;
  // warm-up and approximation sets remain separate from the session estimate.
  const calculated = Math.ceil(
    day.exercises.reduce(
        (sum, p) =>
          sum +
          (p.sets * 30 +
            Math.max(0, p.sets - 1) * restSeconds(getExercise(p.exerciseId, prefs))) /
            60,
        0,
      ),
  );
  // This is guidance, not a countdown. Short plans still reserve time for
  // preparation, transitions and a calm pace between exercises.
  return Math.max(36, calculated);
}
export function fitDay(day: Day, prefs: Preferences, preserveId?: string, level: Level = "intermediate"): Day {
  // Exercise limits guide automatic generation only. A user editing a plan can
  // keep every exercise they deliberately add.
  return day;
}
const upper: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps"];
const lower: Muscle[] = ["quads", "hamstrings", "glutes", "calves", "abs"];

// These are deliberately narrower than the primary muscle. Two exercises can
// train the same muscle while still being useful together (for example a hack
// squat and a leg extension), but repeating the same joint action in one day
// adds fatigue without adding much stimulus.
export const lowerMovementFamily = (exercise: Exercise) => {
  if (exercise.muscle === "quads") {
    if (exercise.id === "hack" || exercise.id === "pendulum") return "quad-squat-machine";
    if (exercise.id === "leg-extension") return "quad-extension";
    if (exercise.id === "leg-press") return "quad-press";
  }
  if (exercise.muscle === "hamstrings" &&
    ["standing-curl", "seated-curl", "lying-curl"].includes(exercise.id))
    return "hamstring-curl";
  return undefined;
};

const isQuadExtension = (exercise: Exercise) => exercise.id === "leg-extension";
const isRomanianDeadlift = (exercise: Exercise) =>
  ["rdl-bar", "rdl-dumbbell", "rdl-smith", "rdl-machine"].includes(exercise.id);
const isHamstringMachineCurl = (exercise: Exercise) =>
  ["standing-curl", "seated-curl", "lying-curl"].includes(exercise.id);
const isChestPress = (exercise: Exercise) =>
  exercise.muscle === "chest" && exercise.type === "compound";
const isPecDec = (exercise: Exercise) =>
  ["chest-cable", "pec-deck", "standing-cable-pec-dec"].includes(exercise.id);

export const glutesEnabled = (p: Profile) => p.includeGlutes ?? (p.sex === "female" || p.priority === "glutes");
export const specializationTarget = (p: Profile) => {
  if (p.priority === "balanced") return 0;
  const days = Math.min(APP.maxDays, Math.max(1, p.days));
  const base = p.level === "beginner" ? 6 : 8;
  if (days === 1) return base;
  if (days === 2) return base + 2;
  if (days === 3) return base + 4;
  if (days === 4) return p.level === "beginner" ? 12 : 14;
  return p.level === "beginner" ? 14 : 16;
};
export function weeklyTargets(
  p: Profile,
  overrides?: Partial<Record<Muscle, number>>,
): Record<Muscle, number> {
  const large = p.level === "beginner" ? 6 : 8;
  const targets: Record<Muscle, number> = {
    chest: 4, shoulders: 4, biceps: 4, triceps: 4, calves: 4, abs: 4,
    back: large, quads: large, hamstrings: large,
    glutes: glutesEnabled(p) ? large + (p.sex === "female" ? 2 : 0) : 0,
  };
  // In a one- or two-day full-body plan, weekly recovery and session space
  // are limited. Allocate the available volume from large groups down to
  // smaller ones, with a sex-specific emphasis when the goal is balanced.
  if (p.days <= 2) {
    targets.chest = p.sex === "male" ? 6 : 4;
    targets.back = p.sex === "male" ? 8 : 6;
    targets.quads = p.sex === "female" ? 8 : 6;
    targets.hamstrings = 4;
    targets.glutes = glutesEnabled(p) ? (p.sex === "female" ? 8 : 4) : 0;
    targets.shoulders = 2;
    targets.biceps = 2;
    targets.triceps = 2;
    targets.calves = 0;
    targets.abs = 0;
  }
  if (p.priority !== "balanced") targets[p.priority] = specializationTarget(p);
  for (const muscle of [...upper, ...lower]) {
    const target = overrides?.[muscle];
    if (typeof target === "number" && Number.isFinite(target))
      targets[muscle] = Math.max(0, Math.floor(target));
  }
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
      const lowerRank = (exercise: Exercise) => {
        const family = lowerMovementFamily(exercise);
        if (exercise.muscle === "quads")
          return family === "quad-squat-machine" ? 0 : family === "quad-extension" ? 1 : family === "quad-press" ? 2 : 3;
        if (exercise.muscle === "hamstrings") return family === "hamstring-curl" ? 1 : 0;
        return 0;
      };
      const chestRank = (exercise: Exercise) =>
        isChestPress(exercise) ? 0 : isPecDec(exercise) ? 1 : 2;
      return Number(ea.muscle === muscle) - Number(eb.muscle === muscle)
        || (ea.muscle === eb.muscle && ea.muscle === "chest" ? chestRank(ea) - chestRank(eb) : 0)
        || (ea.muscle === eb.muscle ? lowerRank(ea) - lowerRank(eb) : 0)
        || Number(eb.type === "compound") - Number(ea.type === "compound");
    });
    ordered.push(remaining.shift()!);
  }
  return ordered;
}
export function generateRoutine(
  profile: Profile,
  prefs: Preferences,
  overrides?: Partial<Record<Muscle, number>>,
): Day[] {
  const count = Math.min(APP.maxDays, Math.max(1, profile.days));
  const targets = weeklyTargets(profile, overrides);
  // Keep the familiar day names/split. Automatic prescriptions always start
  // at the app's conservative two effective sets per exercise.
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
    // Calves and abs are worthwhile, but they make a full-body session longer
    // without being central to its main multi-joint work. They belong on lower
    // split days instead; users can still add them manually whenever desired.
    if (isFullBodyDay(day) && (muscle === "calves" || muscle === "abs")) return false;
    const isSpecialization = profile.priority !== "balanced" && profile.priority === muscle;
    if (isSpecialization) return true;
    if (count > 3 && (muscle === "biceps" || muscle === "triceps") && profile.priority !== muscle) {
      const torsoIndex = torsoDays.findIndex((torso) => torso.id === day.id);
      return muscle === "biceps" ? torsoIndex === 0 : torsoIndex === 1;
    }
    return count <= 2 || day.name.startsWith("Full") || day.name === "Especialización" || (day.name.startsWith("Torso") ? upper : lower).includes(muscle);
  };
  const currentVolume = (muscle: Muscle) => days
    .flatMap(day => day.exercises)
    .filter(entry => getExercise(entry.exerciseId, prefs).muscle === muscle)
    .reduce((sum, entry) => sum + entry.sets, 0);
  const exerciseUses = (exerciseId: string) => days
    .flatMap(day => day.exercises)
    .filter(entry => entry.exerciseId === exerciseId).length;
  const frequencyTwoExercises = new Set(["supported-row", "lateral-cable"]);
  const overlappingQuadPatterns = new Set(["hack", "pendulum"]);
  const canUseExercise = (day: Day, exercise: Exercise) => {
    if (frequencyTwoExercises.has(exercise.id)) {
      if (exerciseUses(exercise.id) >= 2) return false;
      if (count > 3 && !day.name.startsWith("Torso") && day.name !== "Especialización") return false;
    }
    // Gironda is an extra horizontal pull, not the replacement for the main
    // supported row. It only enters a back specialization after frequency two.
    if (exercise.id === "gironda-row")
      return profile.priority === "back" && exerciseUses("supported-row") >= 2;
    // Jaca and hack squat pendular are near-identical patterns. Auto-generated
    // plans choose one so progression can be tracked instead of duplicating it.
    if (overlappingQuadPatterns.has(exercise.id))
      return ![...overlappingQuadPatterns].some(id => id !== exercise.id && exerciseUses(id) > 0);
    const family = lowerMovementFamily(exercise);
    // Never put two curl machines for the hamstrings in one session. A hinge
    // (RDL) remains a valid complementary movement when the target needs it.
    if (family && day.exercises.some(p => lowerMovementFamily(getExercise(p.exerciseId, prefs)) === family))
      return false;
    const sameMuscle = day.exercises
      .map(entry => getExercise(entry.exerciseId, prefs))
      .filter(item => item.muscle === exercise.muscle);
    if (exercise.muscle === "quads") {
      // A second quad slot is always the extension. A third is the press;
      // beyond that the automatic generator spreads work to another day.
      if (sameMuscle.length === 1) return isQuadExtension(exercise);
      if (sameMuscle.length === 2) return exercise.id === "leg-press";
      if (sameMuscle.length >= 3) return false;
    }
    if (exercise.muscle === "hamstrings" && sameMuscle.length === 1 &&
      isRomanianDeadlift(sameMuscle[0]))
      return isHamstringMachineCurl(exercise);
    if (exercise.muscle === "chest" && sameMuscle.length === 1 &&
      isChestPress(sameMuscle[0]))
      return isPecDec(exercise);
    return true;
  };
  const add = (day: Day, muscle: Muscle) => {
    if (currentVolume(muscle) >= targets[muscle]) return false;
    let options = candidates(muscle, profile, prefs, true).filter(e =>
      !day.exercises.some(p => p.exerciseId === e.id) &&
      (!isHeavyExercise(e) || heavyExerciseCount(day, prefs) < automaticHeavyExerciseLimit(day, count)) &&
      canUseExercise(day, e),
    );
    if (muscle === "back") {
      const fullBodyBack = days
        .filter(isFullBodyDay)
        .flatMap(fullBodyDay => fullBodyDay.exercises)
        .map(entry => getExercise(entry.exerciseId, prefs))
        .filter(exercise => exercise.muscle === "back" && exercise.pullPattern);
      const fullBodyPatterns = new Set(fullBodyBack.map(exercise => exercise.pullPattern));
      // A full-body plan may only have two back slots. Cover both movement
      // patterns before repeating one, so two rows do not occupy them both.
      const missingFullBodyPattern = isFullBodyDay(day) && fullBodyPatterns.size === 1
        ? fullBodyPatterns.has("horizontal") ? "vertical" : "horizontal"
        : undefined;
      const fullBodyPatternPriority = (exercise: Exercise) =>
        Number(!!missingFullBodyPattern && exercise.pullPattern === missingFullBodyPattern);
      const wideUsed = exerciseUses("wide-pulldown");
      const neutralUsed = exerciseUses("neutral-pulldown");
      const pulldowns = options.filter(exercise =>
        exercise.id === "wide-pulldown" || exercise.id === "neutral-pulldown",
      );
      const shouldDiversifyPulldowns = pulldowns.length === 2 &&
        !options.some(exercise =>
          exercise.priority < Math.min(...pulldowns.map(item => item.priority)),
        );
      const pulldownVariety = (exercise: Exercise) =>
        (wideUsed > 0 && neutralUsed === 0 && exercise.id === "neutral-pulldown") ||
        (neutralUsed > 0 && wideUsed === 0 && exercise.id === "wide-pulldown")
          ? 1
          : 0;
      // In a back specialization, the supported row remains the first
      // horizontal pattern twice per week. Once that base and both primary
      // vertical pulls are already present, Gironda is the extra horizontal
      // option rather than repeating a lower-value variation first.
      const shouldAddGironda = profile.priority === "back" &&
        exerciseUses("supported-row") >= 2 &&
        wideUsed > 0 &&
        neutralUsed > 0;
      const girondaPriority = (exercise: Exercise) =>
        shouldAddGironda && exercise.id === "gironda-row" ? 1 : 0;
      options = options.sort((a, b) =>
        girondaPriority(b) - girondaPriority(a) ||
        fullBodyPatternPriority(b) - fullBodyPatternPriority(a) ||
        (shouldDiversifyPulldowns
          ? pulldownVariety(b) - pulldownVariety(a)
          : 0) ||
        a.priority - b.priority ||
        Number(b.pullPattern !== lastPull && !!b.pullPattern) - Number(a.pullPattern !== lastPull && !!a.pullPattern));
    }
    // In 4–5 day plans reserve the two heavy slots for the chest/back work.
    // Hombro can still be trained hard when it is the stated priority.
    if (count > 3 && muscle === "shoulders" && profile.priority !== "shoulders")
      options = options.sort((a, b) => Number(b.type === "isolation") - Number(a.type === "isolation"));
    if (muscle === "hamstrings" && (used[muscle] ?? 0) % 2 === 1) {
      options = options.sort((a, b) => Number(b.id === "seated-curl") - Number(a.id === "seated-curl"));
    }
    if (muscle === "quads") {
      // The pendulum hack is the preferred Jaca pattern whenever the user
      // can perform it. Jaca remains the automatic intermediate option.
      if (profile.level === "advanced" && options.some(exercise => exercise.id === "pendulum"))
        options = options.sort((a, b) => Number(b.id === "pendulum") - Number(a.id === "pendulum"));
      const hasSquatMachine = day.exercises.some(p => lowerMovementFamily(getExercise(p.exerciseId, prefs)) === "quad-squat-machine");
      const hasExtension = day.exercises.some(p => lowerMovementFamily(getExercise(p.exerciseId, prefs)) === "quad-extension");
      // After a heavy jaca/pendulum, the useful next quad exercise is an
      // isolation extension. If a third quad exercise is needed, use the
      // press so the session contains three distinct patterns.
      if (hasSquatMachine && !hasExtension)
        options = options.sort((a, b) => Number(b.id === "leg-extension") - Number(a.id === "leg-extension"));
      else if (hasSquatMachine && hasExtension)
        options = options.sort((a, b) => Number(b.id === "leg-press") - Number(a.id === "leg-press"));
    }
    // Once a Jaca or Hack Pendular plus base quad work is in place, Prensa is
    // the preferred additional heavy pattern instead of stacking similar squats.
    if (muscle === "quads" &&
      currentVolume("quads") >= 4 &&
      [...overlappingQuadPatterns].some(id => exerciseUses(id) > 0)) {
      options = options.sort((a, b) => Number(b.id === "leg-press") - Number(a.id === "leg-press"));
    }
    const e = options[0];
    if (!e) return false;
    // A generated exercise is never given a partial or inflated prescription:
    // every automatic entry uses exactly two sets.
    if (targets[muscle] - currentVolume(muscle) < APP.defaultSets) return false;
    day.exercises.push(prescribe(e, prefs, `${day.id}-${e.id}`));
    used[muscle] = (used[muscle] ?? 0) + 1;
    if (e.pullPattern) lastPull = e.pullPattern;
    return true;
  };
  // Put glutes next to the other lower-body staples so their base work lands
  // on the leg day before a full-body day spends its limited heavy slots.
  const muscles: Muscle[] = ["quads", "glutes", "chest", "back", "hamstrings", "shoulders", "calves", "abs", "biceps", "triceps"];
  if (profile.priority !== "balanced") muscles.sort((a, b) => Number(b === profile.priority) - Number(a === profile.priority));
  if (profile.priority !== "balanced") {
    for (const day of days.slice(0, 3)) add(day, profile.priority);
  }
  // Cover each group first. Repeated rounds distribute exposure across the week.
  for (let round = 0; round < 30; round++) {
    let changed = false;
    for (const muscle of muscles) {
      if (targets[muscle] <= currentVolume(muscle)) continue;
      const possible = days.filter(d => allowed(d, muscle) && d.exercises.length < exerciseLimit(profile.level));
      possible.sort((a, b) =>
        a.exercises.filter(p => getExercise(p.exerciseId, prefs).muscle === muscle).length - b.exercises.filter(p => getExercise(p.exerciseId, prefs).muscle === muscle).length
        || a.exercises.length - b.exercises.length);
      for (const day of possible) if (add(day, muscle)) { changed = true; break; }
    }
    if (!changed) break;
  }
  return days.map(d => ({ ...d, exercises: orderExercises(d.exercises, prefs) }));
}
