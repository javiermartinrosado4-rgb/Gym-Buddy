import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP } from "../config";
import { AppState } from "../types";
import { catalog } from "../data/catalog";
import { validRange, validWeight } from "../logic/validation";
import { validAvatar, validAvatarPhoto } from "../data/avatars";
import { resumeWorkout } from "../logic/workout";
import { localDateKey } from "../logic/schedule";
export interface StateRepository {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
}
export function decodeState(raw: string): AppState {
  const s = JSON.parse(raw) as AppState;
  if (
    !s ||
    s.version !== 1 ||
    !s.profile ||
    !s.preferences ||
    !Array.isArray(s.routine) ||
    !Array.isArray(s.history) ||
    !["system", "light", "dark"].includes(s.theme)
  )
    throw new Error("Invalid state");
  const p = s.profile;
  if (p.avatar !== undefined && !validAvatar(p.avatar) && !validAvatarPhoto(p.avatar)) throw new Error("Invalid avatar");
  if ((p.name !== undefined && typeof p.name !== "string") || (p.handle !== undefined && typeof p.handle !== "string") ||
    (p.includeGlutes !== undefined && typeof p.includeGlutes !== "boolean") || (p.mesocycle !== undefined && typeof p.mesocycle !== "boolean") ||
    (s.signedOut !== undefined && typeof s.signedOut !== "boolean")) throw new Error("Invalid profile additions");
  if (
    p.trainingDays !== undefined &&
    (!Array.isArray(p.trainingDays) ||
      new Set(p.trainingDays).size !== p.days ||
      p.trainingDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7))
  )
    throw new Error("Invalid training days");
  if (s.bodyWeights !== undefined && (!Array.isArray(s.bodyWeights) || s.bodyWeights.some(p => !Number.isFinite(p.weight) || p.weight < 30 || p.weight > 350 || !Number.isFinite(Date.parse(p.date))))) throw new Error("Invalid body weight history");
  if (s.volumeTargets !== undefined && (
    typeof s.volumeTargets !== "object" ||
    Object.entries(s.volumeTargets).some(([muscle, value]) =>
      !catalog.some(exercise => exercise.muscle === muscle) ||
      !Number.isInteger(value) || value < 0 || value > 60,
    )
  )) throw new Error("Invalid volume targets");
  if (s.plannedWorkouts !== undefined && (!Array.isArray(s.plannedWorkouts) || s.plannedWorkouts.some(item =>
    !item || typeof item.dayId !== "string" || !item.day || typeof item.day.name !== "string" || !Array.isArray(item.day.exercises) || !Number.isFinite(Date.parse(item.date))))
  ) throw new Error("Invalid planned workouts");
  if (s.plannedWorkouts && new Set(s.plannedWorkouts.map(item => localDateKey(item.date))).size !== s.plannedWorkouts.length) throw new Error("Duplicate planned workouts");
  if (s.skippedWorkoutDates !== undefined && (
    !Array.isArray(s.skippedWorkoutDates) ||
    s.skippedWorkoutDates.some(date => typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) ||
    new Set(s.skippedWorkoutDates).size !== s.skippedWorkoutDates.length
  )) throw new Error("Invalid skipped workout dates");
  if (
    !["beginner", "intermediate", "advanced"].includes(p.level) ||
    !Number.isInteger(p.days) ||
    p.days < 1 ||
    p.days > 7 ||
    !["male", "female", ""].includes(p.sex) ||
    !["manual", "photo", "unknown"].includes(p.fatMode) ||
    ![p.age, p.height, p.weight, p.bodyFat].every((v) => typeof v === "string")
  )
    throw new Error("Invalid profile");
  const prefs = s.preferences;
  if (
    !Array.isArray(prefs.custom) ||
    !Array.isArray(prefs.unavailable) ||
    (prefs.favorites !== undefined &&
      (!Array.isArray(prefs.favorites) ||
        prefs.favorites.some(id => typeof id !== "string") ||
        new Set(prefs.favorites).size !== prefs.favorites.length)) ||
    !Array.isArray(prefs.equipment) ||
    !prefs.names ||
    (prefs.notes !== undefined &&
      (typeof prefs.notes !== "object" ||
        Object.values(prefs.notes).some(note => typeof note !== "string" || note.length > 300))) ||
    !prefs.weights ||
    !prefs.ranges
  )
    throw new Error("Invalid preferences");
  const ids = new Set([...catalog, ...prefs.custom].map((e) => e.id));
  if (prefs.favorites?.some(id => !ids.has(id))) throw new Error("Invalid favorite exercises");
  if (
    s.routine.some(
      (d) =>
        !Array.isArray(d.exercises) ||
        d.exercises.some(
          (e) =>
            !ids.has(e.exerciseId) ||
            !validRange(e.range) ||
            !validWeight(e.weight) ||
            !Number.isInteger(e.sets) ||
            e.sets < 1 ||
            e.sets > 6,
        ),
    )
  )
    throw new Error("Invalid routine");
  if (s.plannedWorkouts?.some(item => item.day.exercises.some(e =>
    !ids.has(e.exerciseId) || !validRange(e.range) || !validWeight(e.weight) || !Number.isInteger(e.sets) || e.sets < 1 || e.sets > 6,
  ))) throw new Error("Invalid planned workout exercises");
  if (
    s.active &&
    (!Array.isArray(s.active.draft) ||
      (s.active.skipped !== undefined &&
        (!Array.isArray(s.active.skipped) ||
          s.active.skipped.some((id) => typeof id !== "string"))) ||
      (s.active.drafts !== undefined &&
        (typeof s.active.drafts !== "object" ||
          Object.values(s.active.drafts).some((draft) => !Array.isArray(draft)))) ||
      !s.active.day?.exercises?.length ||
      !Number.isInteger(s.active.index) ||
      s.active.index < 0 ||
      s.active.index >= s.active.day.exercises.length)
  )
    throw new Error("Invalid session");
  return s.active ? { ...s, active: resumeWorkout(s) } : s;
}
export const localRepository: StateRepository = {
  async load() {
    const raw = await AsyncStorage.getItem(APP.storageKey);
    return raw ? decodeState(raw) : null;
  },
  async save(state) {
    await AsyncStorage.setItem(APP.storageKey, JSON.stringify(state));
  },
};
