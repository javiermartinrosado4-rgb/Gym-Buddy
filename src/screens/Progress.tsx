import { messages } from "../content/es";
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import {
  Button,
  Card,
  Heading,
  Icon,
  Page,
  Pill,
  Row,
  Txt,
} from "../components/ui";
import { useStore } from "../state/Store";
import { useTheme } from "../theme";
import { ProgressChart } from "../components/ProgressChart";
import { bodyWeightProgress, exerciseProgress, scoreProgress } from "../logic/progress";
import { displayName } from "../logic/routine";
export default function Progress() {
  const { state } = useStore();
  const { colors } = useTheme();
  const ids = [...new Set(state.history.flatMap(w => w.records.map(r => r.prescription.exerciseId)))];
  const [selected, setSelected] = useState<string>();
  const exerciseId = selected ?? ids[0];
  const score = scoreProgress(state);
  return (
    <Page>
      <Heading
        eyebrow={messages.Progress.tuRecorrido}
        title={messages.Progress.cadaSesionSuma}
        subtitle={messages.Progress.elProgresoTambienEsVolverAIntentarlo}
      />
      <Row>
        <Card style={{ flex: 1 }}>
          <Txt size={30} weight="500">
            {state.history.length}
          </Txt>
          <Txt size={12} muted>
            {messages.Progress.sesionesCompletadas}
          </Txt>
        </Card>
        <Card style={{ flex: 1 }}>
          <Txt size={30} weight="500">
            {state.history.reduce(
              (total, w) =>
                total +
                w.records.reduce((count, r) => count + r.sets.length, 0),
              0,
            )}
          </Txt>
          <Txt size={12} muted>
            {messages.Progress.seriesRegistradas}
          </Txt>
        </Card>
      </Row>
      <ProgressChart title="Peso corporal" points={bodyWeightProgress(state)} unit="kg" />
      <Card>
        <Pill>Puntuación experimental · sin nivel asignado</Pill>
        <Txt muted size={13}>Media de la carga relativa: 100 × peso levantado / peso corporal registrado en esa sesión. La fórmula definitiva, su nombre y los niveles están pendientes de diseño; todavía no mide tu nivel real.</Txt>
        <Txt muted size={12}>Se incluyen ejercicios de peso libre del catálogo y máquinas que validemos. Las mancuernas se registran por unidad. Usa siempre la misma técnica y compara también las repeticiones.</Txt>
        <Txt muted size={12}>Base fija de esta gráfica: {score.exercises.length} ejercicios. Empieza cuando todos tienen datos; al incorporar un ejercicio nuevo se recalcula el periodo comparable.</Txt>
        {score.exercises.map(id => <Txt key={id} size={12}>{displayName(id, state.preferences)}</Txt>)}
      </Card>
      <ProgressChart title="Evolución de la puntuación" points={score.points} unit="puntos" />
      {!!ids.length && <>
        <Txt weight="600">Progreso por ejercicio o máquina</Txt>
        <View style={{ gap: 6 }}>
          {ids.map(id => <Button key={id} label={displayName(id, state.preferences)} compact variant={exerciseId === id ? "primary" : "secondary"} onPress={() => setSelected(id)} />)}
        </View>
        <ProgressChart key={exerciseId} title={`Carga: ${displayName(exerciseId, state.preferences)}`} points={exerciseProgress(state.history, exerciseId)} unit="kg" />
      </>}
      {!state.history.length ? (
        <Card style={{ alignItems: "center", paddingVertical: 32 }}>
          <View
            style={{
              padding: 22,
              backgroundColor: colors.accentSoft,
              borderRadius: 50,
            }}
          >
            <Icon name="bar-chart-2" size={34} />
          </View>
          <Txt size={20} weight="600">
            {messages.Progress.tuHistoriaEmpiezaAqui}
          </Txt>
          <Txt muted size={14} style={{ textAlign: "center" }}>
            {messages.Progress.alTerminarTuPrimerEntrenamientoVerasAqui}
          </Txt>
          <Button
            label={messages.Progress.irAMiPrimerEntrenamiento}
            variant="secondary"
            onPress={() => router.replace("/today")}
          />
        </Card>
      ) : (
        <>
          <Txt weight="600" size={18}>
            {messages.Progress.tuHistorial}
          </Txt>
          {[...state.history].reverse().map((w) => (
            <Card key={w.id}>
              <Pill>
                {new Date(w.date).toLocaleDateString("es", {
                  day: "numeric",
                  month: "long",
                })}
              </Pill>
              <Txt weight="600" size={20}>
                {w.dayName}
              </Txt>
              <Txt muted size={13}>
                {w.records.length}
                {messages.Progress.ejercicios}
                {w.minutes}
                {messages.Progress.minTranscurridos}
              </Txt>
              {w.records.map((r, i) => (
                <View key={i} style={{ gap: 3 }}>
                  <Txt size={13} weight="600">
                    {r.name}
                  </Txt>
                  <Txt size={12} muted>
                    {r.sets
                      .map((s) => `${s.weight} kg × ${s.reps}`)
                      .join(" · ")}
                  </Txt>
                </View>
              ))}
              {!!w.skipped?.length && (
                <Txt size={12} muted>
                  No realizados hoy: {w.skipped.join(", ")}
                </Txt>
              )}
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
