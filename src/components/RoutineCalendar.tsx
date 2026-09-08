import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Day, ExerciseRecord, PlannedWorkout, Workout } from "../types";
import { useStore } from "../state/Store";
import { displayName } from "../logic/routine";
import { datesForMonth, datesForWeek, localDateKey, scheduledDay, scheduledWorkout, trainingStreak } from "../logic/schedule";
import { number, validWeight } from "../logic/validation";
import { useTheme } from "../theme";
import { Button, Card, Choice, Field, Notice, Row, Txt } from "./ui";

const weekdayLabels = ["L", "M", "X", "J", "V", "S", "D"];
const cloneDay = (day: Day): Day => ({ ...day, exercises: day.exercises.map(entry => ({ ...entry, range: [...entry.range] as [number, number] })) });
const dateAtNoon = (date: Date) => {
  const saved = new Date(date);
  saved.setHours(12, 0, 0, 0);
  return saved.toISOString();
};
const moveMonth = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const moveWeek = (date: Date, offset: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset * 7);
  return next;
};
const sameDate = (a: Date, b: Date) => localDateKey(a) === localDateKey(b);
type MovingSession = { sourceKey: string; day: Day; fromRecurring: boolean };

function PastWorkoutEditor({ workout }: { workout: Workout }) {
  const { update } = useStore();
  const [draft, setDraft] = useState(() => workout.records.map(record => record.sets.map(set => ({ weight: String(set.weight), reps: String(set.reps) }))));
  const [error, setError] = useState("");
  const set = (recordIndex: number, setIndex: number, field: "weight" | "reps", value: string) => {
    setDraft(current => current.map((record, r) => r === recordIndex ? record.map((entry, s) => s === setIndex ? { ...entry, [field]: value } : entry) : record));
    setError("");
  };
  const save = () => {
    const records: ExerciseRecord[] = workout.records.map((record, r) => ({
      ...record,
      sets: record.sets.map((_set, s) => ({ weight: number(draft[r][s].weight), reps: number(draft[r][s].reps) })),
    }));
    if (records.some(record => record.sets.some(set => !validWeight(set.weight) || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 100))) {
      setError("Revisa cada peso y repetición antes de guardar.");
      return;
    }
    update(state => ({ ...state, history: state.history.map(item => item.id === workout.id ? { ...item, records } : item) }));
  };
  return <Card>
    <Txt weight="600">Corregir entrenamiento registrado</Txt>
    <Txt muted size={12}>Corrige pesos o repeticiones si registraste un error. La fecha y la estructura de tu rutina no cambian.</Txt>
    {workout.records.map((record, r) => <View key={`${workout.id}-${record.prescription.id}`} style={{ gap: 7 }}>
      <Txt weight="600">{record.name}</Txt>
      {record.sets.map((_set, s) => <Row key={s}>
        <Field label={`Peso ${record.name}, serie ${s + 1}`} value={draft[r][s].weight} onChangeText={value => set(r, s, "weight", value)} numeric suffix="kg" />
        <Field label={`Repeticiones ${record.name}, serie ${s + 1}`} value={draft[r][s].reps} onChangeText={value => set(r, s, "reps", value)} numeric suffix="rep" />
      </Row>)}
    </View>)}
    {!!error && <Notice error>{error}</Notice>}
    <Button label="Guardar corrección" onPress={save} />
  </Card>;
}

function PlannedWorkoutEditor({ date, day, existing }: { date: Date; day: Day; existing?: PlannedWorkout }) {
  const { state, update } = useStore();
  const [weights, setWeights] = useState(() => Object.fromEntries(day.exercises.map(entry => [entry.id, String(entry.weight)])));
  const [error, setError] = useState("");
  const save = () => {
    const exercises = day.exercises.map(entry => ({ ...entry, weight: number(weights[entry.id]) }));
    if (exercises.some(entry => !validWeight(entry.weight))) {
      setError("Indica un peso entre 0 y 1000 kg, en incrementos de 0,25 kg.");
      return;
    }
    const item: PlannedWorkout = { date: dateAtNoon(date), dayId: day.id, day: { ...cloneDay(day), exercises } };
    update(current => ({ ...current, plannedWorkouts: [...(current.plannedWorkouts ?? []).filter(value => localDateKey(value.date) !== localDateKey(date)), item] }));
    setError("");
  };
  const clear = () => update(current => ({ ...current, plannedWorkouts: (current.plannedWorkouts ?? []).filter(value => localDateKey(value.date) !== localDateKey(date)) }));
  return <Card>
    <Txt weight="600">Preparar {day.name}</Txt>
    <Txt muted size={12}>Estos pesos se aplican solo a esta fecha. La rutina semanal y tus otras sesiones futuras no cambian.</Txt>
    {day.exercises.map(entry => <Field key={entry.id} label={`Peso para ${displayName(entry.exerciseId, state.preferences)}`} value={weights[entry.id]} onChangeText={value => { setWeights(current => ({ ...current, [entry.id]: value })); setError(""); }} numeric suffix="kg" />)}
    {!!error && <Notice error>{error}</Notice>}
    <Button label="Guardar pesos para esta sesión" onPress={save} />
    {!!existing && <Button label="Usar pesos de la rutina" compact variant="ghost" onPress={clear} />}
  </Card>;
}

export function RoutineCalendar() {
  const { state, update } = useStore();
  const { colors } = useTheme();
  const now = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(now);
  const [selected, setSelected] = useState(now);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<MovingSession | null>(null);
  const dates = mode === "week" ? datesForWeek(cursor) : datesForMonth(cursor);
  const monthTitle = cursor.toLocaleDateString("es", { month: "long" });
  const yearTitle = String(cursor.getFullYear());
  const selectedKey = localDateKey(selected);
  const selectedHistory = state.history.filter(workout => localDateKey(workout.date) === selectedKey);
  const selectedBase = scheduledDay(state.profile, state.routine, selected);
  const selectedPlan = scheduledWorkout(state.profile, state.routine, state.plannedWorkouts, selected, state.skippedWorkoutDates);
  const selectedOverride = state.plannedWorkouts?.find(item => localDateKey(item.date) === selectedKey);
  const selectedSkipped = state.skippedWorkoutDates?.includes(selectedKey) ?? false;
  const isPast = selectedKey < localDateKey(now);
  const streak = trainingStreak(state.profile, state.routine, state.history, state.plannedWorkouts, state.skippedWorkoutDates, now);
  const addSession = (day: Day) => {
    const item: PlannedWorkout = { date: dateAtNoon(selected), dayId: day.id, day: cloneDay(day) };
    update(current => ({ ...current, plannedWorkouts: [...(current.plannedWorkouts ?? []).filter(value => localDateKey(value.date) !== selectedKey), item] }));
    setAdding(false);
  };
  const removeSession = () => update(current => ({
    ...current,
    plannedWorkouts: (current.plannedWorkouts ?? []).filter(item => localDateKey(item.date) !== selectedKey),
    skippedWorkoutDates: selectedBase ? Array.from(new Set([...(current.skippedWorkoutDates ?? []), selectedKey])) : current.skippedWorkoutDates,
  }));
  const restoreSession = () => update(current => ({ ...current, skippedWorkoutDates: (current.skippedWorkoutDates ?? []).filter(date => date !== selectedKey) }));
  const moveHere = () => {
    if (!moving) return;
    const item: PlannedWorkout = { date: dateAtNoon(selected), dayId: moving.day.id, day: cloneDay(moving.day) };
    update(current => ({
      ...current,
      plannedWorkouts: [...(current.plannedWorkouts ?? []).filter(value => ![moving.sourceKey, selectedKey].includes(localDateKey(value.date))), item],
      skippedWorkoutDates: moving.fromRecurring ? Array.from(new Set([...(current.skippedWorkoutDates ?? []), moving.sourceKey])) : current.skippedWorkoutDates,
    }));
    setMoving(null);
  };
  const canMoveHere = !!moving && !isPast && !selectedHistory.length && !selectedPlan && selectedKey !== moving.sourceKey;
  return <Card>
    <Txt weight="600" size={20}>Calendario de entrenamiento</Txt>
    <Txt muted size={13}>Consulta cualquier mes del año. Selecciona un día para corregir un registro pasado o preparar el peso de una sesión futura.</Txt>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 }}>
      <Txt size={28}>⚡</Txt>
      <View style={{ flex: 1 }}>
        <Txt weight="600">{streak} {streak === 1 ? "día" : "días"} cumpliendo el plan</Txt>
        <Txt muted size={12}>{streak ? "Tu racha sigue activa: completa tu próxima sesión programada." : "Completa tu próxima sesión programada para empezar tu racha."}</Txt>
      </View>
    </View>
    <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
      <Button label="Semana" compact variant={mode === "week" ? "primary" : "secondary"} onPress={() => setMode("week")} />
      <Button label="Mes" compact variant={mode === "month" ? "primary" : "secondary"} onPress={() => setMode("month")} />
    </Row>
    <Row style={{ alignItems: "flex-start", gap: 10 }}>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Button label={mode === "week" ? "Semana anterior" : "Mes anterior"} compact variant="ghost" icon="arrow-left" onPress={() => setCursor(current => mode === "week" ? moveWeek(current, -1) : moveMonth(current, -1))} />
        <Txt size={13} weight="600" style={{ textTransform: "capitalize", textAlign: "center", marginTop: 2 }}>{monthTitle}</Txt>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Button label={mode === "week" ? "Semana siguiente" : "Mes siguiente"} compact variant="ghost" icon="arrow-right" onPress={() => setCursor(current => mode === "week" ? moveWeek(current, 1) : moveMonth(current, 1))} />
        <Txt size={12} muted style={{ textAlign: "center", marginTop: 2 }}>{yearTitle}</Txt>
      </View>
    </Row>
    <View style={{ flexDirection: "row", gap: 0 }}>
      {weekdayLabels.map(label => <Txt key={label} size={11} muted weight="600" style={{ width: "13.85%", textAlign: "center" }}>{label}</Txt>)}
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 0 }}>
      {dates.map(date => {
        const history = state.history.filter(workout => localDateKey(workout.date) === localDateKey(date));
        const planned = scheduledWorkout(state.profile, state.routine, state.plannedWorkouts, date, state.skippedWorkoutDates);
        const overridden = state.plannedWorkouts?.some(item => localDateKey(item.date) === localDateKey(date));
        const skipped = state.skippedWorkoutDates?.includes(localDateKey(date));
        const muted = mode === "month" && date.getMonth() !== cursor.getMonth();
        const isSelected = sameDate(date, selected);
        return <Pressable key={localDateKey(date)} accessibilityRole="button" accessibilityLabel={`${date.toLocaleDateString("es")}${history.length ? ": entrenamiento registrado" : planned ? `: ${planned.name}` : skipped ? ": sesiÃ³n quitada" : ": descanso"}`} accessibilityState={{ selected: isSelected }} onPress={() => { setSelected(date); setAdding(false); }} style={({ pressed }) => ({ width: "13.85%", minHeight: mode === "week" ? 92 : 68, borderRadius: 10, padding: 6, gap: 3, backgroundColor: isSelected ? colors.accentSoft : pressed ? colors.soft : "transparent", borderWidth: isSelected ? 1 : 0, borderColor: colors.accent, opacity: muted ? 0.38 : 1 })}>
          <Txt size={12} weight={sameDate(date, now) ? "600" : "400"} style={{ textAlign: "center" }}>{date.getDate()}</Txt>
          {history.length ? <Txt size={10} weight="700" numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.done }}>{history[0].dayName}</Txt> : planned ? <Txt size={10} numberOfLines={1} ellipsizeMode="tail">{planned.name}</Txt> : null}
          {overridden && !history.length && <Txt size={9} muted>ajustada</Txt>}
          {skipped && !history.length && <Txt size={9} muted>quitada</Txt>}
        </Pressable>;
      })}
    </View>
    <Txt muted size={12}>Verde: sesión completada · “ajustada”: pesos específicos guardados para esa fecha.</Txt>
    <Txt weight="600">{selected.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Txt>
    {!!selectedHistory.length && selectedHistory.map(workout => <PastWorkoutEditor key={workout.id} workout={workout} />)}
    {!selectedHistory.length && selectedPlan && !isPast && !moving && <>
      <PlannedWorkoutEditor key={localDateKey(selected)} date={selected} day={selectedPlan} existing={selectedOverride} />
      <Button label="Mover esta sesión" compact variant="secondary" onPress={() => setMoving({ sourceKey: selectedKey, day: selectedPlan, fromRecurring: !!selectedBase })} />
      <Button label="Quitar sesión del calendario" compact variant="ghost" onPress={removeSession} />
    </>}
    {!selectedHistory.length && moving && <Notice>{canMoveHere ? `Mueve ${moving.day.name} a esta fecha.` : "Elige una fecha futura sin sesión para mover el entrenamiento."}</Notice>}
    {!selectedHistory.length && canMoveHere && <Button label="Mover aquí" onPress={moveHere} />}
    {!selectedHistory.length && moving && <Button label="Cancelar movimiento" compact variant="ghost" onPress={() => setMoving(null)} />}
    {!selectedHistory.length && !selectedPlan && !isPast && !moving && <>
      {selectedSkipped ? <Button label="Restaurar sesión programada" compact variant="secondary" onPress={restoreSession} /> : <>
        {!adding ? <Button label="Añadir sesión al calendario" compact variant="secondary" onPress={() => setAdding(true)} /> : <>
          <Txt weight="600">Elige la sesión que quieres añadir</Txt>
          {state.routine.map(day => <Choice key={day.id} title={`Añadir ${day.name}`} description={`${day.exercises.length} ejercicios`} selected={false} onPress={() => addSession(day)} />)}
          <Button label="Cancelar" compact variant="ghost" onPress={() => setAdding(false)} />
        </>}
      </>}
    </>}
    {!selectedHistory.length && !selectedPlan && <Txt muted size={13}>{isPast ? "No hay un entrenamiento registrado este día." : "Día de descanso en tu calendario."}</Txt>}
    {!selectedHistory.length && selectedPlan && isPast && <Txt muted size={13}>Esta sesión no se registró. Los entrenamientos pasados solo se modifican cuando existe un registro.</Txt>}
  </Card>;
}
