import { messages } from "../content/es";
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import * as Linking from "expo-linking";
import { routineShareUrl } from "../logic/endpoints";
import { router } from "expo-router";
import {
  Button,
  Card,
  Choice,
  Field,
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
  heavyExerciseCount,
  heavyExerciseLimit,
  weeklyTargets,
  weeklyVolume,
  generateRoutine,
} from "../logic/routine";
import { levelName, muscleName, muscles } from "../data/options";
import { copy } from "../config";
import { ExerciseEditor } from "../components/ExerciseEditor";
import { routineSchedule, weekdayName } from "../logic/schedule";
import { ExerciseTiers } from "../components/ExerciseTiers";
import { RoutineCalendar } from "../components/RoutineCalendar";
import { Muscle } from "../types";
import { useCommunity } from "../state/Community";
import { exportRoutine } from "../logic/sharing";
export function RoutineOverview() {
  const { state, update } = useStore();
  const { user, request } = useCommunity();
  const [selected, setSelected] = useState(state.routine[0]?.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [targetDraft, setTargetDraft] = useState<Record<Muscle, string>>(() =>
    Object.fromEntries(
      muscles.filter(item => item.id !== "balanced").map(item => [item.id, String(weeklyTargets(state.profile, state.volumeTargets)[item.id as Muscle])]),
    ) as Record<Muscle, string>,
  );
  const [targetError, setTargetError] = useState("");
  const [sharing, setSharing] = useState(false);
  const day = state.routine.find((d) => d.id === selected) ?? state.routine[0];
  const p = state.profile;
  const targets = weeklyTargets(p, state.volumeTargets);
  const volume = weeklyVolume(state.routine, state.preferences);
  const schedule = routineSchedule(p, state.routine);
  const move = (index: number, offset: number) => update(s => ({ ...s, routine: s.routine.map(d => {
    if (d.id !== day.id) return d;
    const exercises = [...d.exercises];
    [exercises[index], exercises[index + offset]] = [exercises[index + offset], exercises[index]];
    return { ...d, exercises };
  }) }));
  const openRegeneration = () => {
    setTargetDraft(Object.fromEntries(
      muscles.filter(item => item.id !== "balanced").map(item => [item.id, String(targets[item.id as Muscle])]),
    ) as Record<Muscle, string>);
    setTargetError("");
    setRegenerating(true);
  };
  const regenerate = () => {
    const entries = muscles.filter(item => item.id !== "balanced").map(item => {
      const value = Number(targetDraft[item.id as Muscle].replace(",", "."));
      return [item.id as Muscle, value] as const;
    });
    if (entries.some(([, value]) => !Number.isInteger(value) || value < 0 || value > 60)) {
      setTargetError("Introduce entre 0 y 60 series semanales enteras para cada grupo muscular.");
      return;
    }
    const volumeTargets = Object.fromEntries(entries) as Partial<Record<Muscle, number>>;
    update(s => ({ ...s, volumeTargets, routine: generateRoutine(s.profile, s.preferences, volumeTargets) }));
    setRegenerating(false);
    setNotice("Rutina regenerada con tus series semanales. Las cargas guardadas se mantienen.");
  };
  const shareRoutine = async () => {
    if (!user || sharing || !state.routine.length) return;
    setSharing(true);
    setNotice("");
    try {
      const published = await request<{ id: string }>("/routines/me", "PUT", exportRoutine(state.routine, state.preferences));
      const url = routineShareUrl(published.id, process.env.EXPO_PUBLIC_WEB_URL,
        Linking.createURL("/shared-routine", { queryParams: { id: published.id } }));
      await Share.share({
        title: "Rutina de Gym Buddy",
        message: `Te comparto mi rutina de Gym Buddy. Puedes copiar su estructura y las notas de cada ejercicio, sin mis pesos: ${url}`,
        url,
      });
      setNotice("Enlace de rutina actualizado. Compártelo por WhatsApp o la red que prefieras.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se ha podido compartir la rutina.");
    } finally {
      setSharing(false);
    }
  };
  return <>
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
      <Card>
        <Txt weight="600">Regenerar rutina</Txt>
        <Txt muted size={13}>Elige las series semanales directas por grupo. La generación automática utiliza bloques de 2 series; puedes ajustar cada ejercicio manualmente después.</Txt>
        {!regenerating ? (
          <Button label="Regenerar y ajustar series" icon="refresh-cw" variant="secondary" onPress={openRegeneration} />
        ) : <>
          {muscles.filter(item => item.id !== "balanced").map(item => (
            <Field
              key={item.id}
              label={`Series semanales de ${item.name}`}
              value={targetDraft[item.id as Muscle]}
              onChangeText={value => {
                setTargetDraft(current => ({ ...current, [item.id as Muscle]: value }));
                setTargetError("");
              }}
              numeric
            />
          ))}
          {!!targetError && <Notice error>{targetError}</Notice>}
          <Row>
            <Button label="Cancelar" compact variant="ghost" onPress={() => setRegenerating(false)} />
            <Button label="Aplicar y regenerar" compact onPress={regenerate} />
          </Row>
        </>}
      </Card>
      <Txt size={17} weight="600">
        {messages.Routine.distribucionSemanal}
      </Txt>
      <Notice>Los abdominales se colocan preferentemente en los días de pierna. Entrenarlos los fortalece; para que se marquen, lo principal es reducir el porcentaje graso mediante la dieta. Su efecto visual directo es menor.</Notice>
      {state.programRevision !== 3 && <Card>
        <Txt>Tu rutina guardada pertenece a la versión anterior. Puedes aplicar los nuevos volúmenes y límites conservando el historial y las cargas; se regenerará el orden y las series del plan.</Txt>
        <Button label="Actualizar rutina a nuevas reglas" onPress={() => update(s => ({ ...s, programRevision: 3, routine: generateRoutine(s.profile, s.preferences, s.volumeTargets) }))} />
      </Card>}
      {state.routine.map((d, i) => (
        <Choice
          key={d.id}
          title={`${weekdayName(schedule[i].weekday)} · ${d.name}`}
          description={`${d.exercises.length} ejercicios · ${heavyExerciseCount(d, state.preferences)} pesados · ${duration(d, state.preferences)} min estimados`}
          selected={day?.id === d.id}
          onPress={() => {
            setSelected(d.id);
            setEditing(null);
            setExpanded(null);
            setNotice("");
          }}
        />
      ))}
      {!!notice && <Notice>{notice}</Notice>}
      {day && (
        <>
          <Heading
            title={day.name}
            subtitle={`${duration(day, state.preferences)} min estimados · 4 min en pesados y 3 min en el resto`}
          />
          {heavyExerciseLimit(p.days) !== Infinity && <Notice>Recomendamos hasta 2 ejercicios pesados por sesión en planes de más de 3 días. Puedes añadir más; tú decides.</Notice>}
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
                  <Pressable accessibilityRole="button" accessibilityLabel={`Ver detalles de ${displayName(entry.exerciseId, state.preferences)}`} onPress={() => setExpanded(expanded === entry.id ? null : entry.id)}>
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
                  <Txt muted size={11}>{expanded === entry.id ? "Ocultar detalles" : "Ver detalles"}</Txt>
                  </Pressable>
                  {expanded === entry.id && <>
                  <Txt muted size={12}>
                    Descanso: {restSeconds(exercise) / 60} min recomendado. Calentamiento y aproximación aparte.
                  </Txt>
                  {exercise.note && <Notice>{exercise.note}</Notice>}
                  </>}
                  <Row>
                    <Button label={`Subir ejercicio ${index + 1}`} compact variant="ghost" icon="arrow-up" disabled={index === 0} onPress={() => move(index, -1)} />
                    <Button label={`Bajar ejercicio ${index + 1}`} compact variant="ghost" icon="arrow-down" disabled={index === day.exercises.length - 1} onPress={() => move(index, 1)} />
                  </Row>
                  <Button
                    compact
                    variant="secondary"
                    label={`Editar ejercicio ${index + 1}`}
                    icon="sliders"
                    onPress={() => {
                      setExpanded(entry.id);
                      setEditing(editing === entry.id ? null : entry.id);
                    }}
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
              onPress={() => setEditing("add")}
            />
          )}
        </>
      )}
      <Card>
        <Txt weight="600" size={18}>Series semanales por grupo muscular</Txt>
        <Txt muted size={12}>Programadas / objetivo. Se cuentan las series directas, sin duplicar el trabajo de músculos secundarios.</Txt>
        {Object.entries(targets).map(([muscle, target]) => {
          const programmed = volume[muscle as keyof typeof volume];
          return <Txt key={muscle} size={13}>
            {muscleName(muscle as keyof typeof targets)}: {programmed} / {programmed === 0 ? 0 : target}
          </Txt>;
        })}
      </Card>
      <Card>
        <Txt weight="600" size={18}>Comparte tu rutina</Txt>
        <Txt muted size={13}>Envía un enlace por WhatsApp o cualquier red. Quien lo abra podrá copiar la estructura, series, repeticiones y notas de los ejercicios; las cargas no se comparten.</Txt>
        {user?.routinePublic ? <Button
          label={sharing ? "Preparando enlace…" : "Compartir rutina"}
          icon="share-2"
          disabled={sharing || !state.routine.length}
          onPress={() => void shareRoutine()}
        /> : <Button
          label={user ? "Activar visibilidad de rutina" : "Conectar con Comunidad para compartir"}
          icon="users"
          variant="secondary"
          onPress={() => router.replace("/community")}
        />}
      </Card>
      <ExerciseTiers />
    </>;
}

export default function Routine() {
  return <Page>
    <Heading
      eyebrow="Tu planificación"
      title="Calendario"
      subtitle="Consulta y ajusta tus sesiones por semana o por mes."
    />
    <RoutineCalendar />
  </Page>;
}
