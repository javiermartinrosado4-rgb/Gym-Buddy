import assert from "node:assert/strict";
import { test } from "node:test";
import { palettes } from "../src/theme/palettes";
import { catalog, formatExerciseName } from "../src/data/catalog";
import { motivationalQuoteForDate, motivationalQuotes } from "../src/content/motivation";
import {
  demoProfile,
  emptyPreferences,
  levels,
  muscles,
} from "../src/data/options";
import {
  candidates,
  duration,
  fitDay,
  generateRoutine,
  getExercise,
  prescribe,
  replacementCandidates,
  exerciseLimit,
  heavyExerciseCount,
  heavyExerciseLimit,
  isFullBodyDay,
  restSeconds,
  specializationTarget,
  weeklyTargets,
  weeklyVolume,
} from "../src/logic/routine";
import { progression, roundWeight } from "../src/logic/progression";
import { profileErrors, validWeight } from "../src/logic/validation";
import { finishWorkout, startWorkout } from "../src/logic/workout";
import { scoreProgress, exerciseProgress } from "../src/logic/progress";
import { AppState, Weekday, Workout } from "../src/types";
import {
  availableWeekdays,
  isoWeekday,
  localDateKey,
  routineSchedule,
  scheduledDay,
  scheduledWeekdays,
  workoutsOnDate,
} from "../src/logic/schedule";
import {
  overallStats,
  workoutStats,
  workoutTrend,
} from "../src/logic/performance";
import { exportRoutine, importRoutine, isSharedRoutine } from "../src/logic/sharing";

const testState = (): AppState => ({ version: 1, profile: demoProfile, preferences: emptyPreferences, theme: "system", completed: true, onboardingStep: 0, routine: generateRoutine(demoProfile, emptyPreferences), history: [] });
const recorded = (id: string, weight: number, bodyWeight = 70, date = "2026-09-07T10:00:00Z"): Workout => {
  const e = getExercise(id, emptyPreferences);
  return { id: date, date, bodyWeight, dayName: "Prueba", minutes: 10, records: [{ name: e.name, type: e.type, prescription: { ...prescribe(e, emptyPreferences), weight }, sets: [{ weight, reps: 10 }, { weight, reps: 10 }] }] };
};
test("35 kg row automatically becomes 36.25 for next session, including persisted preferences", () => {
  const state = testState();
  const next = finishWorkout(state, recorded("supported-row", 35));
  assert.equal(next.preferences.weights["supported-row"], 36.25);
  assert.equal(next.history[0].records[0].sets[0].weight, 35);
  assert.equal(JSON.parse(JSON.stringify(next)).preferences.weights["supported-row"], 36.25);
  assert.equal(next.history[0].bodyWeight, 70);
  const day = next.routine.find(d => d.exercises.some(p => p.exerciseId === "supported-row"))!;
  assert.equal(day.exercises.find(p => p.exerciseId === "supported-row")!.weight, 36.25);
  assert.equal(startWorkout(day, "76,5").bodyWeight, 76.5);
  assert.equal(progression("compound", [6, 8], [{ weight: 35, reps: 8 }, { weight: 35, reps: 8 }], 2, 2.5).increase, false);
  assert.doesNotThrow(() => progression("compound", [6, 8], [{ weight: Infinity, reps: 8 }]));
});
test("score excludes unapproved machines, old missing bodyweight and keeps a fixed cohort", () => {
  const state = testState();
  state.history = [recorded("supported-row", 35)];
  assert.equal(scoreProgress(state).points.length, 0);
  state.history.push(recorded("dumbbell-curl", 14));
  assert.equal(scoreProgress(state).points[0].value, 20);
  state.profile = { ...state.profile, weight: "100" };
  assert.equal(scoreProgress(state).points[0].value, 20);
  state.history.push(recorded("lateral-dumbbell", 7, 70, "2026-09-08T10:00:00Z"));
  assert.equal(scoreProgress(state).points.length, 1);
  assert.equal(scoreProgress(state).points[0].value, 15);
  assert.equal(exerciseProgress(state.history, "supported-row")[0].value, 35);
  state.history = [{ ...recorded("dumbbell-curl", 14), bodyWeight: undefined }];
  assert.equal(scoreProgress(state).points.length, 0);
});
test("weekly availability maps routine sessions to exact weekdays", () => {
  const profile = {
    ...demoProfile,
    days: 4,
    trainingDays: [1, 2, 4, 6] as Weekday[],
  };
  const routine = generateRoutine(profile, emptyPreferences);
  assert.deepEqual(availableWeekdays(profile), [1, 2, 4, 6]);
  assert.deepEqual(scheduledWeekdays(profile, routine.length), [1, 2, 4, 6]);
  assert.deepEqual(
    routineSchedule(profile, routine).map((item) => item.weekday),
    [1, 2, 4, 6],
  );
  assert.equal(scheduledDay(profile, routine, new Date(2026, 8, 7))?.id, "day-0");
  assert.equal(scheduledDay(profile, routine, new Date(2026, 8, 9)), undefined);
  assert.equal(isoWeekday(new Date(2026, 8, 13)), 7);
  assert.equal(localDateKey(new Date(2026, 8, 7)), "2026-09-07");
  const sixAvailable = {
    ...profile,
    days: 6,
    trainingDays: [1, 2, 3, 4, 5, 6] as Weekday[],
  };
  assert.equal(scheduledWeekdays(sixAvailable, 5).length, 5);
  assert.ok(profileErrors({ ...profile, trainingDays: [1, 2] }).trainingDays);
});
test("today history statistics compare only equivalent common exercises", () => {
  const previous = {
    ...recorded("dumbbell-curl", 10, 70, "2026-09-01T10:00:00Z"),
    id: "previous",
    dayId: "day-0",
  };
  const improved = {
    ...recorded("dumbbell-curl", 12, 70, "2026-09-08T10:00:00Z"),
    id: "improved",
    dayId: "day-0",
  };
  const lower = {
    ...recorded("dumbbell-curl", 8, 70, "2026-09-15T10:00:00Z"),
    id: "lower",
    dayId: "day-0",
  };
  assert.equal(workoutTrend(improved, [previous, improved]).status, "up");
  assert.equal(workoutTrend(lower, [previous, improved, lower]).status, "down");
  assert.equal(workoutTrend(previous, [previous]).status, "first");
  assert.deepEqual(workoutStats(previous), {
    sets: 2,
    reps: 20,
    volume: 200,
    exercises: 1,
  });
  assert.deepEqual(overallStats([previous, improved]), {
    sessions: 2,
    sets: 4,
    reps: 40,
    volume: 440,
  });
  assert.equal(
    workoutsOnDate([previous, improved], new Date(2026, 8, 8)).at(-1)?.id,
    "improved",
  );
});

test("420 combinations respect exercise limits, compatible equipment and weekly targets", () => {
  for (const sex of ["male", "female"] as const)
    for (const level of levels)
      for (let days = 1; days <= 7; days++)
        for (const priority of muscles) {
          const profile = { ...demoProfile, sex, level: level.id, days, priority: priority.id };
          const routine = generateRoutine(profile, emptyPreferences);
          assert.equal(routine.length, Math.min(days, 5));
          const targets = weeklyTargets(profile);
          const volume = weeklyVolume(routine, emptyPreferences);
          for (const day of routine) {
            assert.ok(day.exercises.length <= exerciseLimit(level.id));
            if (days > 3)
              assert.ok(heavyExerciseCount(day, emptyPreferences) <= heavyExerciseLimit(days));
            assert.equal(new Set(day.exercises.map(p => p.exerciseId)).size, day.exercises.length);
            for (const p of day.exercises) {
              const e = getExercise(p.exerciseId, emptyPreferences);
            assert.equal(p.sets, 2);
              assert.ok(candidates(e.muscle, profile, emptyPreferences).some(c => c.id === e.id));
              assert.ok(restSeconds(e) >= 180 && restSeconds(e) <= 300);
            }
          }
          for (const m of Object.keys(targets) as (keyof typeof targets)[]) {
            assert.ok(volume[m] <= targets[m]);
          }
        }
});
test("glute defaults can be overridden and specialization scales with training days", () => {
  const male = { ...demoProfile, days: 4, priority: "balanced" as const };
  assert.equal(weeklyVolume(generateRoutine(male, emptyPreferences), emptyPreferences).glutes, 0);
  assert.ok(weeklyVolume(generateRoutine({ ...male, includeGlutes: true }, emptyPreferences), emptyPreferences).glutes > 0);
  assert.equal(weeklyVolume(generateRoutine({ ...male, sex: "female", includeGlutes: false }, emptyPreferences), emptyPreferences).glutes, 0);
  assert.equal(specializationTarget({ ...male, priority: "chest", days: 1 }), 8);
  assert.equal(specializationTarget({ ...male, priority: "chest", days: 2 }), 10);
  assert.equal(specializationTarget({ ...male, priority: "chest", days: 3 }), 12);
  assert.equal(specializationTarget({ ...male, priority: "chest", days: 4 }), 14);
  assert.equal(specializationTarget({ ...male, priority: "chest", days: 5 }), 16);
  assert.equal(specializationTarget({ ...male, level: "beginner", priority: "chest", days: 4 }), 12);
  assert.equal(
    weeklyVolume(generateRoutine({ ...male, days: 5, priority: "chest", mesocycle: false }, emptyPreferences), emptyPreferences).chest,
    16,
  );
  for (const muscle of muscles.filter(m => m.id !== "balanced")) {
    const p = { ...male, days: 5, level: "advanced" as const, priority: muscle.id };
    assert.ok(weeklyVolume(generateRoutine(p, emptyPreferences), emptyPreferences)[muscle.id as "calves"] <= 16, muscle.id);
  }
});
test("short full-body plans prioritize large muscles by profile", () => {
  const man = weeklyTargets({ ...demoProfile, days: 2, sex: "male", priority: "balanced" });
  assert.ok(man.back > man.shoulders && man.back > man.biceps && man.back > man.triceps);
  assert.ok(man.quads > man.hamstrings);
  assert.ok(man.chest > man.hamstrings);
  assert.equal(man.calves, 0);
  assert.equal(man.abs, 0);
  const woman = weeklyTargets({ ...demoProfile, days: 2, sex: "female", priority: "balanced", includeGlutes: true });
  assert.ok(woman.glutes >= woman.back && woman.quads >= woman.back);
  assert.ok(woman.glutes > woman.shoulders && woman.quads > woman.biceps);
});
test("custom volume targets never inflate generated prescriptions above two sets", () => {
  const targets = {
    chest: 1,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    glutes: 0,
    quads: 0,
    hamstrings: 0,
    calves: 0,
  };
  const routine = generateRoutine({ ...demoProfile, days: 1 }, emptyPreferences, targets);
  assert.ok(weeklyVolume(routine, emptyPreferences).chest <= 1);
  assert.ok(routine.flatMap(day => day.exercises).every(entry => entry.sets === 2));
});
test("generation keeps the primary horizontal back work before lower-tier alternatives", () => {
  const routine = generateRoutine({ ...demoProfile, days: 4, priority: "balanced" }, emptyPreferences);
  const back = routine.flatMap(day => day.exercises)
    .filter(entry => getExercise(entry.exerciseId, emptyPreferences).muscle === "back")
    .map(entry => entry.exerciseId);
  assert.equal(back.filter(id => id === "supported-row").length, 2);
  assert.ok(back.includes("wide-pulldown"));
  // A chest press now occupies one of the two heavy torso slots. Keep the
  // core horizontal pattern and at least one vertical pull, rather than
  // filling the remaining slot with a lower-tier horizontal variation.
  assert.ok(!back.includes("gironda-row"));

  const shoulderRoutine = generateRoutine({ ...demoProfile, days: 4, priority: "balanced" }, emptyPreferences);
  const shoulders = shoulderRoutine.flatMap(day => day.exercises)
    .filter(entry => getExercise(entry.exerciseId, emptyPreferences).muscle === "shoulders")
    .map(entry => entry.exerciseId);
  assert.equal(shoulders.filter(id => id === "lateral-cable").length, 2);

  const specialized = generateRoutine({ ...demoProfile, days: 5, priority: "back" }, emptyPreferences);
  const specializedBack = specialized.flatMap(day => day.exercises)
    .filter(entry => getExercise(entry.exerciseId, emptyPreferences).muscle === "back")
    .map(entry => entry.exerciseId);
  assert.ok(specializedBack.includes("gironda-row"));
});
test("back exposures mix horizontal and vertical pulls and heavy exercises lead", () => {
  const routine = generateRoutine({ ...demoProfile, days: 4 }, emptyPreferences);
  const back = routine.flatMap(d => d.exercises).map(p => getExercise(p.exerciseId, emptyPreferences)).filter(e => e.muscle === "back");
  assert.ok(back.some(e => e.pullPattern === "vertical"));
  assert.ok(back.some(e => e.pullPattern === "horizontal"));
  for (const d of routine) {
    if (d.exercises.some(p => getExercise(p.exerciseId, emptyPreferences).type === "compound"))
      assert.equal(getExercise(d.exercises[0].exerciseId, emptyPreferences).type, "compound");
  }
});
test("full-body plans cover a vertical and horizontal pull before repeating either", () => {
  const routine = generateRoutine({ ...demoProfile, days: 2, priority: "balanced" }, emptyPreferences);
  const patterns = routine
    .filter(isFullBodyDay)
    .flatMap(day => day.exercises)
    .map(entry => getExercise(entry.exerciseId, emptyPreferences))
    .filter(exercise => exercise.muscle === "back")
    .map(exercise => exercise.pullPattern);
  assert.deepEqual(new Set(patterns), new Set(["horizontal", "vertical"]));
});
test("Pec Dec is paired with a chest press before another chest isolation", () => {
  const routine = generateRoutine({ ...demoProfile, days: 2, priority: "balanced" }, emptyPreferences);
  const chest = routine.flatMap(day => day.exercises)
    .map(entry => getExercise(entry.exerciseId, emptyPreferences))
    .filter(exercise => exercise.muscle === "chest");
  assert.ok(chest.some(exercise => ["chest-cable", "pec-deck", "standing-cable-pec-dec"].includes(exercise.id)));
  assert.ok(chest.some(exercise => exercise.type === "compound"));

  const cableOnly = generateRoutine({ ...demoProfile, days: 2, priority: "balanced" }, {
    ...emptyPreferences,
    equipment: ["cable"],
  }, { chest: 4, back: 0, shoulders: 0, biceps: 0, triceps: 0, glutes: 0, quads: 0, hamstrings: 0, calves: 0, abs: 0 });
  assert.equal(cableOnly.flatMap(day => day.exercises).filter(entry => entry.exerciseId === "chest-cable").length, 1);
});
test("full-body sessions cap fatigue, avoid calves and abs, and alternate muscles", () => {
  for (const days of [1, 2, 3]) {
    const routine = generateRoutine({ ...demoProfile, days, priority: "balanced" }, emptyPreferences);
    const fullBodyDays = routine.filter(isFullBodyDay);
    assert.ok(fullBodyDays.length > 0);
    for (const day of fullBodyDays) {
      const exercises = day.exercises.map(entry => getExercise(entry.exerciseId, emptyPreferences));
      assert.ok(heavyExerciseCount(day, emptyPreferences) <= 3);
      assert.ok(exercises.filter(exercise => exercise.type === "isolation").length >= 2);
      assert.ok(!exercises.some(exercise => exercise.muscle === "calves" || exercise.muscle === "abs"));
      for (let index = 1; index < exercises.length; index++)
        assert.notEqual(exercises[index - 1].muscle, exercises[index].muscle);
    }
  }
});
test("two-day full body limits each muscle to two weekly heavy sets and separates RDL from Jaca", () => {
  const routine = generateRoutine({ ...demoProfile, days: 2, priority: "balanced" }, emptyPreferences);
  for (const muscle of muscles.filter(item => item.id !== "balanced").map(item => item.id)) {
    const heavy = routine.flatMap(day => day.exercises)
      .map(entry => getExercise(entry.exerciseId, emptyPreferences))
      .filter(exercise => exercise.muscle === muscle && exercise.type === "compound");
    assert.ok(heavy.length <= 1, `${muscle} has more than two weekly heavy sets`);
  }
  for (const day of routine) {
    const ids = day.exercises.map(entry => entry.exerciseId);
    assert.ok(!(ids.includes("hack") && ids.some(id => id.startsWith("rdl-"))));
    assert.ok(!(ids.includes("pendulum") && ids.some(id => id.startsWith("rdl-"))));
  }
});
test("abdominal work is assigned to leg days when the split has them", () => {
  const routine = generateRoutine({ ...demoProfile, days: 4, priority: "balanced" }, emptyPreferences);
  const daysWithAbs = routine.filter(day => day.exercises.some(entry =>
    getExercise(entry.exerciseId, emptyPreferences).muscle === "abs",
  ));
  assert.ok(daysWithAbs.length > 0);
  assert.ok(daysWithAbs.every(day => day.name.startsWith("Pierna")));
});
test("balanced three-day plans keep the leg day focused and let favorites break compatible ties", () => {
  const routine = generateRoutine({ ...demoProfile, days: 3, priority: "balanced" }, emptyPreferences);
  const leg = routine.find(day => day.name === "Pierna")!;
  const torso = routine.find(day => day.name === "Torso")!;
  const legExercises = leg.exercises.map(entry => getExercise(entry.exerciseId, emptyPreferences));
  assert.equal(legExercises.filter(exercise => exercise.muscle === "abs").length, 1);
  assert.equal(legExercises.filter(exercise => exercise.muscle === "calves").length, 0);
  assert.equal(torso.exercises.filter(entry => getExercise(entry.exerciseId, emptyPreferences).muscle === "biceps").length, 1);
  assert.equal(torso.exercises.filter(entry => getExercise(entry.exerciseId, emptyPreferences).muscle === "triceps").length, 1);
  const pulls = torso.exercises.map(entry => getExercise(entry.exerciseId, emptyPreferences))
    .filter(exercise => exercise.muscle === "back").map(exercise => exercise.pullPattern);
  assert.deepEqual(new Set(pulls), new Set(["horizontal", "vertical"]));

  const preferred = candidates("chest", demoProfile, { ...emptyPreferences, favorites: ["chest-press-free"] }, true);
  assert.equal(preferred[0].id, "chest-press-free");
});
test("quad generation selects one hack pattern and uses leg press for added heavy volume", () => {
  const routine = generateRoutine(
    { ...demoProfile, days: 4, level: "advanced", priority: "balanced" },
    emptyPreferences,
    { chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, glutes: 0, quads: 16, hamstrings: 0, calves: 0, abs: 0 },
  );
  const quads = routine.flatMap(day => day.exercises)
    .filter(entry => getExercise(entry.exerciseId, emptyPreferences).muscle === "quads")
    .map(entry => entry.exerciseId);
  assert.equal(new Set(quads.filter(id => id === "hack" || id === "pendulum")).size, 1);
  assert.ok(quads.includes("leg-press"));
  assert.equal(getExercise("leg-press", emptyPreferences).tier, "S");
});
test("advanced profiles prefer the pendulum hack over Jaca", () => {
  const advanced = generateRoutine({ ...demoProfile, days: 2, level: "advanced", priority: "balanced" }, emptyPreferences)
    .flatMap(day => day.exercises).map(entry => entry.exerciseId);
  const intermediate = generateRoutine({ ...demoProfile, days: 2, level: "intermediate", priority: "balanced" }, emptyPreferences)
    .flatMap(day => day.exercises).map(entry => entry.exerciseId);
  assert.ok(advanced.includes("pendulum"));
  assert.ok(!advanced.includes("hack"));
  assert.ok(intermediate.includes("hack"));
  assert.ok(!intermediate.includes("pendulum"));
});
test("quad work uses Prensa before a second squat pattern, with a narrow advanced fallback", () => {
  const normal = generateRoutine(
    { ...demoProfile, days: 4, level: "advanced", priority: "balanced" },
    emptyPreferences,
    { chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, glutes: 0, quads: 16, hamstrings: 0, calves: 0, abs: 0 },
  ).flatMap(day => day.exercises).map(entry => entry.exerciseId);
  assert.ok(normal.includes("leg-press"));
  assert.equal(normal.filter(id => id === "hack" || id === "pendulum").length, 1);

  const noPress = { ...emptyPreferences, equipment: ["machine" as const], unavailable: ["leg-press"] };
  const fallback = generateRoutine(
    { ...demoProfile, days: 4, level: "advanced", priority: "balanced" },
    noPress,
    { chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, glutes: 0, quads: 16, hamstrings: 0, calves: 0, abs: 0 },
  ).flatMap(day => day.exercises).map(entry => entry.exerciseId);
  assert.ok(fallback.includes("hack") && fallback.includes("pendulum"));
});
test("lower-body sessions vary quad and hamstring movement patterns", () => {
  for (const days of [1, 2, 3, 4, 5]) {
    const routine = generateRoutine({ ...demoProfile, days, level: "advanced", priority: "balanced" }, emptyPreferences, {
      chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, glutes: 0,
      quads: 16, hamstrings: 16, calves: 0, abs: 0,
    });
    for (const day of routine) {
      const ids = day.exercises.map(entry => entry.exerciseId);
      const quadIds = ids.filter(id => ["hack", "pendulum", "leg-extension", "leg-press"].includes(id));
      const curls = ids.filter(id => ["standing-curl", "seated-curl", "lying-curl"].includes(id));
      assert.ok(curls.length <= 1, `${day.name} has duplicate hamstring curls: ${curls.join(", ")}`);
      assert.ok(!(quadIds.includes("hack") && quadIds.includes("pendulum")), `${day.name} repeats the hack pattern`);
      if (quadIds.includes("hack") || quadIds.includes("pendulum")) {
        if (quadIds.length >= 2) {
          assert.ok(quadIds.includes("leg-extension"), `${day.name} should pair the jaca with extension`);
          assert.ok(ids.indexOf("leg-extension") > ids.indexOf("hack") || ids.indexOf("leg-extension") > ids.indexOf("pendulum"), `${day.name} should place extension after the jaca`);
        }
        if (quadIds.length >= 3) {
          assert.ok(quadIds.includes("leg-press"), `${day.name} should use press as the third quad pattern`);
          assert.ok(ids.indexOf("leg-press") > ids.indexOf("leg-extension"), `${day.name} should place press after extension`);
        }
      }
    }
  }
});
test("a hamstring mesocycle may pair seated and lying curls for four direct sets", () => {
  const onlyMachine = { ...emptyPreferences, equipment: ["machine" as const] };
  const targets = {
    chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0,
    glutes: 0, quads: 0, hamstrings: 4, calves: 0, abs: 0,
  };
  const normal = generateRoutine(
    { ...demoProfile, days: 1, priority: "balanced" }, onlyMachine, targets,
  )[0].exercises.map(entry => entry.exerciseId);
  assert.ok(normal.filter(id => ["standing-curl", "seated-curl", "lying-curl"].includes(id)).length <= 1);

  const mesocycle = generateRoutine(
    { ...demoProfile, days: 1, priority: "hamstrings", mesocycle: true }, onlyMachine, targets,
  )[0].exercises.map(entry => entry.exerciseId);
  assert.ok(mesocycle.includes("seated-curl"));
  assert.ok(mesocycle.includes("lying-curl"));
});
test("paired exercises follow the quad, Romanian and chest press sequence", () => {
  const withoutUpperOrGlutes = {
    chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0,
    glutes: 0, calves: 0, abs: 0,
  };
  const quads = generateRoutine({ ...demoProfile, days: 1, level: "advanced" }, emptyPreferences, {
    ...withoutUpperOrGlutes, quads: 6, hamstrings: 0,
  })[0].exercises.map(entry => entry.exerciseId);
  // A one-day plan is full body, so it keeps the weekly heavy quad work to
  // the pendular pattern plus its lighter extension rather than adding Prensa.
  assert.deepEqual(quads, ["pendulum", "leg-extension"]);

  const hamstrings = generateRoutine({ ...demoProfile, days: 1, level: "advanced" }, {
    ...emptyPreferences, equipment: ["machine", "free"],
  }, { ...withoutUpperOrGlutes, quads: 0, hamstrings: 4 })[0].exercises.map(entry => entry.exerciseId);
  assert.equal(hamstrings[0], "rdl-bar");
  assert.ok(["standing-curl", "seated-curl", "lying-curl"].includes(hamstrings[1]));

  const chest = generateRoutine({ ...demoProfile, days: 1, level: "advanced" }, {
    ...emptyPreferences, equipment: ["machine"],
  }, { ...withoutUpperOrGlutes, chest: 4, quads: 0, hamstrings: 0 })[0].exercises.map(entry => entry.exerciseId);
  assert.equal(chest[0], "chest-press");
  assert.equal(chest[1], "pec-deck");

});
test("replacement suggestions preserve pull and press movement patterns", () => {
  const pulldown = getExercise("wide-pulldown", emptyPreferences);
  const pullSuggestions = replacementCandidates(pulldown, demoProfile, emptyPreferences);
  const firstHorizontal = pullSuggestions.findIndex(e => e.pullPattern === "horizontal");
  const lastVertical = pullSuggestions.reduce((last, e, index) => e.pullPattern === "vertical" ? index : last, -1);
  assert.ok(lastVertical >= 0);
  assert.ok(firstHorizontal < 0 || lastVertical < firstHorizontal);

  const chestPress = getExercise("chest-press", emptyPreferences);
  const chestSuggestions = replacementCandidates(chestPress, demoProfile, emptyPreferences);
  const firstNonPress = chestSuggestions.findIndex(e => e.type !== "compound");
  const lastPress = chestSuggestions.reduce((last, e, index) => e.type === "compound" ? index : last, -1);
  assert.ok(lastPress >= 0);
  assert.ok(firstNonPress < 0 || lastPress < firstNonPress);

  const shoulderPress = getExercise("shoulder-press", emptyPreferences);
  assert.equal(replacementCandidates(shoulderPress, demoProfile, emptyPreferences)[0].type, "compound");
});
test("four and five-day torso plans alternate arms unless they are the priority", () => {
  for (const days of [4, 5]) {
    const routine = generateRoutine(
      { ...demoProfile, days, priority: "balanced" },
      emptyPreferences,
    );
    const torso = routine.filter((day) => day.name.startsWith("Torso"));
    assert.equal(torso.length, 2);
    assert.ok(torso[0].exercises.some((p) => getExercise(p.exerciseId, emptyPreferences).muscle === "biceps"));
    assert.ok(!torso[0].exercises.some((p) => getExercise(p.exerciseId, emptyPreferences).muscle === "triceps"));
    assert.ok(torso[1].exercises.some((p) => getExercise(p.exerciseId, emptyPreferences).muscle === "triceps"));
    assert.ok(!torso[1].exercises.some((p) => getExercise(p.exerciseId, emptyPreferences).muscle === "biceps"));
  }
  for (const priority of ["biceps", "triceps"] as const) {
    const torso = generateRoutine(
      { ...demoProfile, days: 4, priority },
      emptyPreferences,
    ).filter((day) => day.name.startsWith("Torso"));
    assert.ok(torso.every((day) =>
      day.exercises.some((p) => getExercise(p.exerciseId, emptyPreferences).muscle === priority),
    ));
  }
});
test("extra direct arm volume can use both torso sessions", () => {
  const routine = generateRoutine(
    { ...demoProfile, days: 4, priority: "balanced" },
    emptyPreferences,
    { biceps: 8 },
  ).filter(day => day.name.startsWith("Torso"));
  assert.ok(routine.every(day => day.exercises.some(entry =>
    getExercise(entry.exerciseId, emptyPreferences).muscle === "biceps",
  )));
});
test("two direct arm exercises pair biceps with triceps and advanced arms prioritize cable", () => {
  const arms = generateRoutine(
    { ...demoProfile, days: 1, priority: "balanced" },
    emptyPreferences,
    { chest: 0, back: 0, shoulders: 0, biceps: 4, triceps: 4, glutes: 0, quads: 0, hamstrings: 0, calves: 0, abs: 0 },
  )[0].exercises.map(entry => getExercise(entry.exerciseId, emptyPreferences).muscle);
  assert.deepEqual(arms, ["biceps", "triceps", "biceps", "triceps"]);
  for (const muscle of ["shoulders", "triceps"] as const)
    assert.equal(candidates(muscle, { ...demoProfile, level: "advanced" }, emptyPreferences)[0].variant, "cable");
});
test("catalog priority, unavailable exercises, equipment and seated curl", () => {
  assert.equal(getExercise("standing-curl", emptyPreferences).name, "Curl Isquios Tumbado");
  for (const exercise of catalog) {
    assert.equal(exercise.name, formatExerciseName(exercise.name));
    assert.doesNotMatch(exercise.name, /\b(a|al|con|de|del|en|el|la|las|los|para|por)\b/i);
  }
  assert.deepEqual(
    catalog.filter(exercise => exercise.muscle === "abs").map(exercise => [exercise.id, exercise.tier]),
    [["cable-floor-crunch", "S"], ["machine-crunch", "S"], ["machine-leg-tuck", "A"], ["machine-leg-raise", "A"]],
  );
  assert.equal(candidates("chest", { ...demoProfile, level: "advanced" }, emptyPreferences)[0].variant, "cable");
  assert.equal(candidates("back", { ...demoProfile, level: "advanced" }, emptyPreferences, true)[0].id, "supported-row");
  assert.equal(getExercise("assisted-pullup", emptyPreferences).pullPattern, "vertical");
  assert.ok(!candidates("back", { ...demoProfile, level: "beginner" }, emptyPreferences).some(e => e.id === "pronated-pullup" || e.id === "neutral-pullup"));
  assert.ok(candidates("back", { ...demoProfile, level: "beginner" }, emptyPreferences).some(e => e.id === "assisted-pullup"));
  assert.equal(
    candidates("chest", demoProfile, emptyPreferences)[0].id,
    "chest-cable",
  );
  assert.equal(
    candidates(
      "chest",
      { ...demoProfile, level: "beginner" },
      emptyPreferences,
    )[0].id,
    "chest-press",
  );
  const prefs = {
    ...emptyPreferences,
    unavailable: ["chest-cable", "pec-deck"],
  };
  assert.equal(candidates("chest", demoProfile, prefs)[0].id, "chest-press");
  const routine = generateRoutine({ ...demoProfile, days: 5 }, prefs);
  assert.ok(
    !routine.some((d) =>
      d.exercises.some((e) => prefs.unavailable.includes(e.exerciseId)),
    ),
  );
  const machineOnly = { ...emptyPreferences, equipment: ["machine"] as const };
  assert.ok(
    candidates("back", demoProfile, {
      ...machineOnly,
      equipment: [...machineOnly.equipment],
    }).every((e) => e.variant === "machine"),
  );
  assert.ok(routine.some(d => d.exercises.some(e => e.exerciseId === "seated-curl")));
});
test("motivational rotation contains attributed and original gym-focused quotes", () => {
  assert.ok(motivationalQuotes.length >= 8);
  assert.equal(motivationalQuotes.find(quote => quote.author === "Javi")?.text,
    "Cuando el fracaso es una opción, eventualmente se convierte en consecuencia.");
  assert.ok(motivationalQuotes.every(quote => quote.text.length > 20));
  assert.equal(motivationalQuoteForDate(new Date(2026, 8, 8)), motivationalQuoteForDate(new Date(2026, 8, 8)));
});
test("routine sharing keeps structure and exercise notes but never shares loads", () => {
  const routine = generateRoutine(demoProfile, emptyPreferences);
  const first = routine[0].exercises[0];
  const preferences = { ...emptyPreferences, notes: { [first.exerciseId]: "Controla la bajada" } };
  const shared = exportRoutine(routine, preferences);
  assert.ok(isSharedRoutine(shared));
  assert.equal(JSON.stringify(shared).includes("weight"), false);
  assert.equal(shared.days[0].exercises[0].note, "Controla la bajada");
  const imported = importRoutine(shared, { ...emptyPreferences, notes: { [first.exerciseId]: "Mi propia nota" } });
  assert.equal(imported.routine[0].exercises[0].weight, 0);
  assert.equal(imported.preferences.notes?.[first.exerciseId], "Mi propia nota");
});
test("free-weight entries require intermediate level and advanced entries remain gated", () => {
  for (const e of catalog.filter(
    (e) => e.variant === "free",
  ))
    assert.notEqual(e.minLevel, "beginner");
  for (const id of ["cable-y-raise", "pendulum", "kickback"])
    assert.equal(catalog.find((e) => e.id === id)?.minLevel, "advanced");
  assert.match(
    catalog.find((e) => e.id === "standing-calf")!.note!,
    /rodillas extendidas/,
  );
});
test("manual exercise additions are not capped and duration reflects longer rests", () => {
  const entries = catalog
    .slice(0, 10)
    .map((e) => ({ ...prescribe(e, emptyPreferences), sets: 4 }));
  const fit = fitDay(
    { id: "test", name: "Prueba", exercises: entries },
    emptyPreferences,
    entries.at(-1)!.id,
  );
  assert.equal(fit.exercises.length, entries.length);
  assert.ok(duration(fit, emptyPreferences) > 60);
  assert.equal(fit.exercises.length, entries.length);
  assert.ok(fit.exercises.some((p) => p.id === entries.at(-1)!.id));
});
test("duration uses thirty-second sets and four or three minutes between sets", () => {
  const heavy = prescribe(getExercise("chest-press", emptyPreferences), emptyPreferences);
  const isolation = prescribe(getExercise("pec-deck", emptyPreferences), emptyPreferences);
  assert.equal(restSeconds(getExercise(heavy.exerciseId, emptyPreferences)), 240);
  assert.equal(restSeconds(getExercise(isolation.exerciseId, emptyPreferences)), 180);
  assert.equal(duration({ id: "heavy", name: "Pesado", exercises: [{ ...heavy, sets: 2 }] }, emptyPreferences), 45);
  assert.equal(duration({ id: "isolation", name: "Aislamiento", exercises: [{ ...isolation, sets: 2 }] }, emptyPreferences), 45);
  assert.equal(duration({ id: "mixed", name: "Mixto", exercises: [{ ...heavy, sets: 2 }, { ...isolation, sets: 2 }] }, emptyPreferences), 45);
});
test("double progression: all effective sets, configurable range, 5% and 3%", () => {
  assert.equal(
    progression(
      "compound",
      [6, 8],
      [
        { weight: 40, reps: 8 },
        { weight: 40, reps: 7 },
      ],
    ).increase,
    false,
  );
  assert.equal(
    progression(
      "compound",
      [6, 8],
      [
        { weight: 40, reps: 8 },
        { weight: 40, reps: 8 },
      ],
    ).suggested,
    41.25,
  );
  assert.equal(
    progression(
      "compound",
      [6, 8],
      [
        { weight: 40, reps: 10 },
        { weight: 40, reps: 9 },
      ],
    ).suggested,
    41.25,
    "superar el máximo del rango también debe preparar una subida de peso",
  );
  assert.equal(
    progression(
      "isolation",
      [8, 10],
      [
        { weight: 12, reps: 10 },
        { weight: 12, reps: 10 },
      ],
    ).suggested,
    12,
  );
  assert.equal(
    progression(
      "isolation",
      [10, 12],
      [
        { weight: 10, reps: 10 },
        { weight: 10, reps: 10 },
      ],
    ).increase,
    false,
  );
  assert.equal(
    progression("compound", [6, 8], [{ weight: 40, reps: 8 }]).increase,
    false,
  );
  assert.equal(
    progression(
      "compound",
      [6, 8],
      [
        { weight: 40, reps: 8 },
        { weight: 42, reps: 8 },
      ],
    ).increase,
    false,
  );
  assert.equal(
    progression(
      "compound",
      [6, 8],
      [
        { weight: 40, reps: 8 },
        { weight: 40, reps: 8 },
        { weight: 40, reps: 7 },
      ],
      3,
    ).increase,
    false,
  );
  assert.equal(
    progression(
      "compound",
      [6, 8],
      [
        { weight: 0, reps: 8 },
        { weight: 0, reps: 8 },
      ],
    ).increase,
    false,
  );
  for (let kg = 0.25; kg < 500; kg += 0.25)
    for (const type of ["compound", "isolation"] as const) {
      const suggestion = progression(
        type,
        [6, 8],
        [
          { weight: kg, reps: 8 },
          { weight: kg, reps: 8 },
        ],
      );
      assert.ok(validWeight(suggestion.suggested));
      assert.ok(suggestion.suggested >= kg);
      if (suggestion.increase) {
        assert.ok(suggestion.suggested / kg >= 1.03 - 1e-8);
        assert.ok(suggestion.suggested / kg <= 1.05 + 1e-8);
      }
    }
  assert.equal(roundWeight(12.38), 12.5);
});
test("profile validation accepts decimal commas and strictly gates photo simulation", () => {
  assert.deepEqual(profileErrors(demoProfile), {});
  assert.ok(profileErrors({ ...demoProfile, weight: "abc" }).weight);
  assert.ok(
    profileErrors({
      ...demoProfile,
      age: "18",
      fatMode: "photo",
      photoConfirmed: true,
    }).photo,
  );
  assert.ok(
    profileErrors({
      ...demoProfile,
      age: "19",
      fatMode: "photo",
      photoConfirmed: false,
    }).photo,
  );
  assert.deepEqual(
    profileErrors({
      ...demoProfile,
      age: "19",
      fatMode: "photo",
      photoConfirmed: true,
    }),
    {},
  );
  assert.ok(profileErrors({ ...demoProfile, bodyFat: "99" }).bodyFat);
});

test("text and controls maintain at least 4.5:1 contrast in both themes", () => {
  const luminance = (hex: string) => {
    const rgb = hex
      .slice(1)
      .match(/../g)!
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const ratio = (a: string, b: string) => {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  for (const p of Object.values(palettes)) {
    for (const bg of [p.background, p.surface, p.soft, p.accentSoft])
      for (const fg of [p.text, p.muted]) assert.ok(ratio(bg, fg) >= 4.5);
    assert.ok(ratio(p.accent, p.onAccent) >= 4.5);
    assert.ok(ratio(p.error, p.errorSoft) >= 4.5);
  }
});
