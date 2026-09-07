export type Level = "beginner" | "intermediate" | "advanced";
export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";
export type Variant = "machine" | "free" | "cable" | "smith";
export type ExerciseType = "compound" | "isolation";
export type Range = [number, number];
export type ThemeMode = "system" | "light" | "dark";
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface Profile {
  name?: string;
  handle?: string;
  includeGlutes?: boolean;
  mesocycle?: boolean;
  sex: "male" | "female" | "";
  age: string;
  height: string;
  weight: string;
  fatMode: "manual" | "unknown" | "photo";
  bodyFat: string;
  photoConfirmed: boolean;
  level: Level;
  days: number;
  trainingDays?: Weekday[];
  priority: Muscle | "balanced";
}
export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  secondary: Muscle[];
  priority: number;
  minLevel: Level;
  type: ExerciseType;
  equipment: string;
  variant: Variant;
  range: Range;
  substitutions: string[];
  note?: string;
  custom?: boolean;
  pullPattern?: "vertical" | "horizontal";
  scoreEligible?: boolean;
  loadStep?: number;
}
export interface Prescription {
  id: string;
  exerciseId: string;
  sets: number;
  range: Range;
  weight: number;
}
export interface Day {
  id: string;
  name: string;
  exercises: Prescription[];
}
export interface Preferences {
  unavailable: string[];
  equipment: Variant[];
  names: Record<string, string>;
  weights: Record<string, number>;
  ranges: Record<string, Range>;
  custom: Exercise[];
  loadSteps?: Record<string, number>;
}
export interface SetRecord {
  weight: number;
  reps: number;
}
export interface ExerciseRecord {
  prescription: Prescription;
  name: string;
  type: ExerciseType;
  sets: SetRecord[];
}
export interface Workout {
  bodyWeight?: number;
  id: string;
  dayId?: string;
  dayName: string;
  date: string;
  minutes: number;
  records: ExerciseRecord[];
  skipped?: string[];
}
export interface ActiveWorkout {
  bodyWeight?: number;
  day: Day;
  index: number;
  startedAt: string;
  records: ExerciseRecord[];
  draft: { weight: string; reps: string }[];
  drafts?: Record<string, { weight: string; reps: string }[]>;
  skipped?: string[];
}
export interface AppState {
  programRevision?: number;
  signedOut?: boolean;
  bodyWeights?: { date: string; weight: number }[];
  version: 1;
  profile: Profile;
  onboardingStep: number;
  completed: boolean;
  theme: ThemeMode;
  preferences: Preferences;
  routine: Day[];
  history: Workout[];
  active?: ActiveWorkout;
}
