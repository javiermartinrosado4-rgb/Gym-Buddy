import { messages } from "../content/es";
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
import { ProgressExplorer } from "../components/ProgressExplorer";
import { ComparisonCard } from "../components/ComparisonCard";
import { estimateCalories } from "../logic/calories";
export default function Progress() {
  const { state } = useStore();
  const { colors } = useTheme();
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
      <ComparisonCard />
      <ProgressExplorer />
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
              {estimateCalories(w) !== null && <Txt muted size={13}>≈ {estimateCalories(w)} kcal estimadas</Txt>}
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
