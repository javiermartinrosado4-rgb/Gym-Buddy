import { messages } from "../content/es";
import { useState } from "react";
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import {
  Button,
  Card,
  Heading,
  Notice,
  Page,
  Pill,
  Row,
  Txt,
  Field,
} from "../components/ui";
import { useStore } from "../state/Store";
import { displayName, getExercise, restSeconds } from "../logic/routine";
import { draftFor, finishWorkout } from "../logic/workout";
import { number, validWeight } from "../logic/validation";
import { ExerciseRecord, SetRecord } from "../types";
import { WeightSuggestion } from "../components/WeightSuggestion";
import { useTheme } from "../theme";

const draftFromRecord = (sets: SetRecord[]) =>
  sets.map((set) => ({ weight: String(set.weight), reps: String(set.reps) }));

export default function Workout() {
  const { state, update } = useStore();
  const { colors } = useTheme();
  const [error, setError] = useState("");
  const active = state.active;
  if (!state.completed || state.signedOut) return <Redirect href="/" />;
  if (!active) {
    const workout = state.history.at(-1);
    return (
      <Page>
        <Heading
          eyebrow={messages.Workout.buenTrabajo}
          title={
            workout
              ? messages.Workout.unaSesionMasParaTi
              : messages.Workout.tuProximaSesionTeEspera
          }
          subtitle={
            workout
              ? `${workout.dayName} · ${workout.records.length} ejercicios registrados${workout.skipped?.length ? ` · ${workout.skipped.length} omitidos` : ""}`
              : messages.Workout.eligeUnDiaDesdeTuRutina
          }
        />
        {workout && (
          <>
            <Pill>{messages.Workout.entrenamientoGuardado}</Pill>
            {!!workout.skipped?.length && (
              <Notice>Hoy no has podido hacer: {workout.skipped.join(", ")}. Tu rutina no se ha modificado.</Notice>
            )}
            <Txt muted>{messages.Workout.revisaLasCargasParaTuProximaSesion}</Txt>
            {workout.records.map((record, i) => (
              <WeightSuggestion key={`${workout.id}-${i}`} record={record} />
            ))}
          </>
        )}
        <Button
          label={messages.Workout.volverAHoy}
          onPress={() => router.replace("/today")}
        />
      </Page>
    );
  }

  const entry = active.day.exercises[active.index];
  const exercise = getExercise(entry.exerciseId, state.preferences);
  const skipped = active.skipped ?? [];
  const drafts = active.drafts ?? { [entry.id]: active.draft };
  const completed = new Set(active.records.map((record) => record.prescription.id));
  const isSkipped = skipped.includes(entry.id);

  const changeSet = (
    index: number,
    field: "weight" | "reps",
    value: string,
  ) => {
    setError("");
    update((s) => {
      if (!s.active) return s;
      const draft = s.active.draft.map((set, i) =>
        i === index ? { ...set, [field]: value } : set,
      );
      return {
        ...s,
        active: {
          ...s.active,
          draft,
          drafts: { ...(s.active.drafts ?? {}), [entry.id]: draft },
        },
      };
    });
  };

  const goTo = (
    target: number,
    records = active.records,
    nextSkipped = skipped,
    nextDrafts = drafts,
  ) => {
    const targetEntry = active.day.exercises[target];
    const saved = records.find((record) => record.prescription.id === targetEntry.id);
    const draft =
      nextDrafts[targetEntry.id] ??
      (saved ? draftFromRecord(saved.sets) : draftFor(targetEntry));
    update((s) =>
      s.active
        ? {
            ...s,
            active: {
              ...s.active,
              index: target,
              records,
              skipped: nextSkipped,
              drafts: {
                ...nextDrafts,
                [entry.id]: active.draft,
                [targetEntry.id]: draft,
              },
              draft,
            },
          }
        : s,
    );
    setError("");
  };

  const nextPending = (records: ExerciseRecord[], nextSkipped: string[]) => {
    const resolved = new Set([
      ...records.map((record) => record.prescription.id),
      ...nextSkipped,
    ]);
    for (let offset = 1; offset < active.day.exercises.length; offset++) {
      const index = (active.index + offset) % active.day.exercises.length;
      if (!resolved.has(active.day.exercises[index].id)) return index;
    }
    return -1;
  };

  const complete = (records: ExerciseRecord[], nextSkipped: string[]) => {
    const ordered = active.day.exercises.flatMap((item) => {
      const record = records.find((candidate) => candidate.prescription.id === item.id);
      return record ? [record] : [];
    });
    update((s) =>
      finishWorkout(s, {
        bodyWeight: active.bodyWeight ?? number(s.profile.weight),
        id: `session-${Date.now()}`,
        dayId: active.day.id,
        date: new Date().toISOString(),
        dayName: active.day.name,
        minutes: Math.max(
          1,
          Math.round(
            (Date.now() - new Date(active.startedAt).getTime()) / 60000,
          ),
        ),
        records: ordered,
        skipped: active.day.exercises
          .filter((item) => nextSkipped.includes(item.id))
          .map((item) => displayName(item.exerciseId, state.preferences)),
      }),
    );
    setError("");
  };

  const saveExercise = () => {
    const sets = active.draft.map((set) => ({
      weight: number(set.weight),
      reps: number(set.reps),
    }));
    if (
      sets.some(
        (set) =>
          !validWeight(set.weight) ||
          !Number.isInteger(set.reps) ||
          set.reps < 1 ||
          set.reps > 100,
      )
    ) {
      setError(messages.Workout.completaCadaSerieConUnPesoValido);
      return;
    }
    const record: ExerciseRecord = {
      prescription: entry,
      name: displayName(entry.exerciseId, state.preferences),
      type: exercise.type,
      sets,
    };
    const records = [
      ...active.records.filter(
        (saved) => saved.prescription.id !== entry.id,
      ),
      record,
    ];
    const nextSkipped = skipped.filter((id) => id !== entry.id);
    const target = nextPending(records, nextSkipped);
    if (target < 0) complete(records, nextSkipped);
    else goTo(target, records, nextSkipped, {
      ...drafts,
      [entry.id]: active.draft,
    });
  };

  const skipExercise = () => {
    const records = active.records.filter(
      (record) => record.prescription.id !== entry.id,
    );
    const nextSkipped = [...new Set([...skipped, entry.id])];
    const target = nextPending(records, nextSkipped);
    if (target < 0) complete(records, nextSkipped);
    else goTo(target, records, nextSkipped, {
      ...drafts,
      [entry.id]: active.draft,
    });
  };

  const remainingAfterCurrent = active.day.exercises.some(
    (item) =>
      item.id !== entry.id &&
      !completed.has(item.id) &&
      !skipped.includes(item.id),
  );

  return (
    <Page>
      <Row style={{ justifyContent: "space-between" }}>
        <Button
          label={messages.Workout.guardarYSalir}
          compact
          variant="ghost"
          icon="arrow-left"
          onPress={() => router.replace("/today")}
        />
        <Txt size={12} muted>
          {active.index + 1} / {active.day.exercises.length}
        </Txt>
      </Row>
      <View
        style={{ height: 5, borderRadius: 3, backgroundColor: colors.border }}
      >
        <View
          style={{
            height: 5,
            borderRadius: 3,
            width: `${((completed.size + skipped.length) / active.day.exercises.length) * 100}%`,
            backgroundColor: colors.accent,
          }}
        />
      </View>
      <Row style={{ justifyContent: "space-between" }}>
        <Button
          label="Ejercicio anterior"
          compact
          variant="secondary"
          icon="arrow-left"
          disabled={active.index === 0}
          onPress={() => goTo(active.index - 1)}
        />
        <Button
          label="Ejercicio siguiente"
          compact
          variant="secondary"
          icon="arrow-right"
          disabled={active.index === active.day.exercises.length - 1}
          onPress={() => goTo(active.index + 1)}
        />
      </Row>
      <Heading
        eyebrow={active.day.name}
        title={displayName(entry.exerciseId, state.preferences)}
        subtitle={`${entry.sets} series efectivas · ${entry.range[0]}–${entry.range[1]} repeticiones`}
      />
      {completed.has(entry.id) && <Pill>Ejercicio registrado · puedes corregirlo</Pill>}
      {isSkipped && <Pill>Omitido por hoy · puedes volver y registrarlo</Pill>}
      <Pill>
        Descanso: 3–5 min · recomendado {restSeconds(exercise) / 60} min
      </Pill>
      <Notice>{messages.Workout.hazElCalentamientoYLasAproximacionesQue}</Notice>
      {exercise.note && <Notice>{exercise.note}</Notice>}
      {active.draft.map((set, index) => (
        <Card key={`${entry.id}-${index}`}>
          <Txt weight="600">
            {messages.Workout.serie}
            {index + 1}
          </Txt>
          <Row>
            <Field
              label={`Peso serie ${index + 1}`}
              value={set.weight}
              onChangeText={(value) => changeSet(index, "weight", value)}
              numeric
              suffix={messages.Workout.kg}
            />
            <Field
              label={`Repeticiones serie ${index + 1}`}
              value={set.reps}
              onChangeText={(value) => changeSet(index, "reps", value)}
              numeric
              suffix={messages.Workout.rep}
            />
          </Row>
        </Card>
      ))}
      {!!error && <Notice error>{error}</Notice>}
      <Button
        label={
          remainingAfterCurrent
            ? messages.Workout.guardarYSiguienteEjercicio
            : messages.Workout.finalizarEntrenamiento
        }
        onPress={saveExercise}
        icon="check"
      />
      <Button
        label="Hoy no he podido hacer este ejercicio"
        variant="ghost"
        icon="slash"
        onPress={skipExercise}
      />
      <Txt size={12} muted>
        Las flechas conservan lo escrito en cada ejercicio. Omitir uno solo afecta a la sesión de hoy y no lo elimina de tu rutina.
      </Txt>
    </Page>
  );
}
