import { messages } from "../content/es";
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import {
  Button,
  Card,
  Choice,
  Heading,
  Notice,
  Page,
  Pill,
  Row,
  Txt,
} from "../components/ui";
import { useStore } from "../state/Store";
import {
  displayName,
  duration,
  getExercise,
  restSeconds,
  exerciseLimit,
  heavyExerciseCount,
  heavyExerciseLimit,
  weeklyTargets,
  weeklyVolume,
  generateRoutine,
} from "../logic/routine";
import { levelName, muscleName } from "../data/options";
import { copy } from "../config";
import { ExerciseEditor } from "../components/ExerciseEditor";
import { startWorkout } from "../logic/workout";
import { routineSchedule, weekdayName } from "../logic/schedule";
export default function Routine() {
  const { state, update } = useStore();
  const [selected, setSelected] = useState(state.routine[0]?.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const day = state.routine.find((d) => d.id === selected) ?? state.routine[0];
  const p = state.profile;
  const targets = weeklyTargets(p);
  const volume = weeklyVolume(state.routine, state.preferences);
  const schedule = routineSchedule(p, state.routine);
  const move = (index: number, offset: number) => update(s => ({ ...s, routine: s.routine.map(d => {
    if (d.id !== day.id) return d;
    const exercises = [...d.exercises];
    [exercises[index], exercises[index + offset]] = [exercises[index + offset], exercises[index]];
    return { ...d, exercises };
  }) }));
  return (
    <Page>
      <Heading
        eyebrow={messages.Routine.tuPlanPersonal}
        title={messages.Routine.unaSemanaConSentido}
        subtitle={messages.Routine.tuRutinaEstaListaAjustaLosDetalles}
      />
      <Card>
        <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <Pill>{levelName(p.level)}</Pill>
          <Txt size={13} muted>
            {state.routine.length}
            {messages.Routine.diasSemana}
          </Txt>
        </Row>
        <Txt size={13} muted>
          {p.sex === "male" ? messages.Routine.hombre : messages.Routine.mujer}{" "}
          · {p.age}
          {messages.Routine.anos}
          {p.height}
          {messages.Routine.cm}
          {p.weight}
          {messages.Routine.kg}
          {p.fatMode !== "unknown"
            ? ` · ${p.bodyFat}% graso${p.fatMode === "photo" ? " (simulado)" : ""}`
            : ""}
        </Txt>
        <Txt size={14}>
          {messages.Routine.prioridad}
          {muscleName(p.priority)}
        </Txt>
        {p.days > 5 && (
          <Txt size={12} muted>
            {p.days}
            {messages.Routine.diasDisponiblesProgramados5}
          </Txt>
        )}
      </Card>
      <Txt size={17} weight="600">
        {messages.Routine.distribucionSemanal}
      </Txt>
      {state.programRevision !== 2 && <Card>
        <Txt>Tu rutina guardada pertenece a la versión anterior. Puedes aplicar los nuevos volúmenes y límites conservando el historial y las cargas; se regenerará el orden y las series del plan.</Txt>
        <Button label="Actualizar rutina a nuevas reglas" onPress={() => update(s => ({ ...s, programRevision: 2, routine: generateRoutine(s.profile, s.preferences) }))} />
      </Card>}
      {state.routine.map((d, i) => (
        <Choice
          key={d.id}
          title={`${weekdayName(schedule[i].weekday)} · ${d.name}`}
          description={`${d.exercises.length}/${exerciseLimit(p.level)} ejercicios · ${heavyExerciseLimit(p.days) === Infinity ? "sin límite extra" : `${heavyExerciseCount(d, state.preferences)}/${heavyExerciseLimit(p.days)} pesados`} · ${duration(d, state.preferences)} min estimados`}
          selected={day?.id === d.id}
          onPress={() => {
            setSelected(d.id);
            setEditing(null);
            setNotice("");
          }}
        />
      ))}
      {!!notice && <Notice>{notice}</Notice>}
      {day && (
        <>
          <Heading
            title={day.name}
            subtitle={`${duration(day, state.preferences)} min estimados · descansos de 3–5 min${heavyExerciseLimit(p.days) === Infinity ? "" : " · máximo 2 ejercicios pesados"}`}
          />
          <Notice>{copy.twoSets}</Notice>
          <Txt muted size={12}>
            {copy.duration}
          </Txt>
          {!day.exercises.length && (
            <Card>
              <Txt weight="600">
                {messages.Routine.hagamosSitioATuPrimerEjercicio}
              </Txt>
              <Txt muted>
                {messages.Routine.noQuedanEjerciciosCompatiblesAnadeUnoO}
              </Txt>
            </Card>
          )}
          {day.exercises.map((entry, index) => {
            const exercise = getExercise(entry.exerciseId, state.preferences);
            return (
              <View key={entry.id} style={{ gap: 12 }}>
                <Card>
                  <Row style={{ alignItems: "flex-start" }}>
                    <Txt size={13} muted style={{ paddingTop: 4 }}>
                      {String(index + 1).padStart(2, "0")}
                    </Txt>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Txt weight="600" size={17}>
                        {displayName(entry.exerciseId, state.preferences)}
                      </Txt>
                      <Txt muted size={12}>
                        {muscleName(exercise.muscle)} ·{" "}
                        {exercise.type === "compound"
                          ? messages.Routine.multiarticular
                          : messages.Routine.aislamiento}
                      </Txt>
                    </View>
                  </Row>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Pill>
                      {entry.sets} × {entry.range[0]}–{entry.range[1]}
                      {messages.Routine.rep}
                    </Pill>
                    <Txt weight="600">
                      {entry.weight === 0
                        ? messages.Routine.cargaPorElegir
                        : `${entry.weight.toFixed(2).replace(".", ",")} kg`}
                    </Txt>
                  </Row>
                  <Txt muted size={12}>
                    Descanso: 3–5 min · recomendado {restSeconds(exercise) / 60} min. Calentamiento y aproximación aparte.
                  </Txt>
                  {exercise.note && <Notice>{exercise.note}</Notice>}
                  <Row>
                    <Button label={`Subir ejercicio ${index + 1}`} compact variant="ghost" icon="arrow-up" disabled={index === 0} onPress={() => move(index, -1)} />
                    <Button label={`Bajar ejercicio ${index + 1}`} compact variant="ghost" icon="arrow-down" disabled={index === day.exercises.length - 1} onPress={() => move(index, 1)} />
                  </Row>
                  <Button
                    compact
                    variant="secondary"
                    label={`Editar ejercicio ${index + 1}`}
                    icon="sliders"
                    onPress={() =>
                      setEditing(editing === entry.id ? null : entry.id)
                    }
                  />
                </Card>
                {editing === entry.id && (
                  <ExerciseEditor
                    key={entry.id}
                    dayId={day.id}
                    prescription={entry}
                    close={() => setEditing(null)}
                    report={setNotice}
                  />
                )}
              </View>
            );
          })}
          {editing === "add" ? (
            <ExerciseEditor
              key={`add-${day.id}`}
              dayId={day.id}
              close={() => setEditing(null)}
              report={setNotice}
            />
          ) : (
            <Button
              label={messages.Routine.anadirEjercicio}
              variant="secondary"
              icon="plus"
              disabled={day.exercises.length >= exerciseLimit(p.level)}
              onPress={() => setEditing("add")}
            />
          )}
          <Button
            label={
              state.active
                ? messages.Routine.continuarSesionEnCurso
                : messages.Routine.empezarEstaSesion
            }
            icon="play"
            disabled={!state.active && !day.exercises.length}
            onPress={() => {
              if (!state.active)
                update((s) => ({ ...s, active: startWorkout(day, s.profile.weight) }));
              router.push("/workout");
            }}
          />
        </>
      )}
      <Card>
        <Txt weight="600" size={18}>Series semanales por grupo muscular</Txt>
        <Txt muted size={12}>Programadas / objetivo. Se cuentan las series directas, sin duplicar el trabajo de músculos secundarios.</Txt>
        {Object.entries(targets).map(([muscle, target]) => <Txt key={muscle} size={13}>
          {muscleName(muscle as keyof typeof targets)}: {volume[muscle as keyof typeof volume]} / {target}
          {volume[muscle as keyof typeof volume] < target ? " · objetivo pendiente" : ""}
        </Txt>)}
        {Object.entries(targets).some(([m, t]) => volume[m as keyof typeof volume] < t) && <Notice>Con tus días, equipamiento y límite de ejercicios no cabe todo el volumen objetivo. Puedes ajustar la disponibilidad o los ejercicios desde Perfil y Rutina.</Notice>}
      </Card>
    </Page>
  );
}
