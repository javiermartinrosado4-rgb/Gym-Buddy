import assert from "node:assert/strict";
import { test } from "node:test";
import { palettes } from "../src/theme/palettes";
import { catalog } from "../src/data/catalog";
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
  exerciseLimit,
  heavyExerciseCount,
  heavyExerciseLimit,
  restSeconds,
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
              assert.ok(p.sets >= 2 && p.sets <= 6);
              assert.ok(candidates(e.muscle, profile, emptyPreferences).some(c => c.id === e.id));
              assert.ok(restSeconds(e) >= 180 && restSeconds(e) <= 300);
            }
          }
          for (const m of Object.keys(targets) as (keyof typeof targets)[]) {
            assert.ok(volume[m] <= targets[m]);
            if (days >= 3) assert.equal(volume[m], targets[m], `${sex} ${level.id} ${days} ${priority.id} ${m}`);
          }
        }
});
test("glute defaults can be overridden and advanced specialization reaches 16 sets", () => {
  const male = { ...demoProfile, days: 4, priority: "balanced" as const };
  assert.equal(weeklyVolume(generateRoutine(male, emptyPreferences), emptyPreferences).glutes, 0);
  assert.ok(weeklyVolume(generateRoutine({ ...male, includeGlutes: true }, emptyPreferences), emptyPreferences).glutes > 0);
  assert.equal(weeklyVolume(generateRoutine({ ...male, sex: "female", includeGlutes: false }, emptyPreferences), emptyPreferences).glutes, 0);
  for (const muscle of muscles.filter(m => m.id !== "balanced")) {
    const p = { ...male, days: 3, level: "advanced" as const, priority: muscle.id, mesocycle: true };
    assert.equal(weeklyVolume(generateRoutine(p, emptyPreferences), emptyPreferences)[muscle.id as "calves"], 16, muscle.id);
  }
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
test("catalog priority, unavailable exercises, equipment and seated curl", () => {
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
    "pec-deck",
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
test("all free-weight entries except the two explicit exceptions require intermediate", () => {
  for (const e of catalog.filter(
    (e) =>
      e.variant === "free" &&
      !["lateral-dumbbell", "dumbbell-curl"].includes(e.id),
  ))
    assert.notEqual(e.minLevel, "beginner");
  for (const id of ["triceps-single", "katana-single", "kickback"])
    assert.equal(catalog.find((e) => e.id === id)?.minLevel, "advanced");
  assert.match(
    catalog.find((e) => e.id === "standing-calf")!.note!,
    /rodillas extendidas/,
  );
});
test("exercise limit preserves edited exercise and duration reflects longer rests", () => {
  const entries = catalog
    .slice(0, 10)
    .map((e) => ({ ...prescribe(e, emptyPreferences), sets: 4 }));
  const fit = fitDay(
    { id: "test", name: "Prueba", exercises: entries },
    emptyPreferences,
    entries.at(-1)!.id,
  );
  assert.equal(fit.exercises.length, 6);
  assert.ok(duration(fit, emptyPreferences) > 60);
  assert.ok(fit.exercises.length < entries.length);
  assert.ok(fit.exercises.some((p) => p.id === entries.at(-1)!.id));
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
