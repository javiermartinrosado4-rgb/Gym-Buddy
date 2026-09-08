import { useState } from "react";
import { View } from "react-native";
import { useStore } from "../state/Store";
import { useTheme } from "../theme";
import { muscles } from "../data/options";
import { allExercises, displayName } from "../logic/routine";
import { bodyWeightProgress, ChartPoint, exerciseProgress, scoreProgress } from "../logic/progress";
import { number } from "../logic/validation";
import { Button, Card, Choice, Field, Notice, Row, Txt } from "./ui";
import { ChartSeries, LineChart } from "./LineChart";

export function ProgressExplorer() {
  const { state, update } = useStore();
  const { colors, dark } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const [period, setPeriod] = useState<"month" | "year" | "all">("month");
  const [now] = useState(Date.now);
  const [weight, setWeight] = useState(state.profile.weight);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const palette = dark ? ["#8ABCF4", "#FFB47A", "#D1A4EA", "#71D6CC", "#F69EAB", "#DDD071"] : ["#2864A5", "#A54A16", "#8249A1", "#167D79", "#B13A5C", "#7D7014"];
  const exercises = allExercises(state.preferences);
  const ids = [...new Set([...state.history.flatMap(w => w.records.map(r => r.prescription.exerciseId)), ...state.routine.flatMap(d => d.exercises.map(p => p.exerciseId))])];
  const periodStart = new Date(now);
  if (period === "month") {
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    periodStart.setMonth(0, 1);
    periodStart.setHours(0, 0, 0, 0);
  }
  const cutoff = period === "all" ? -Infinity : periodStart.getTime();
  const filter = (points: ChartPoint[]) => points.filter(p => Date.parse(p.date) >= cutoff);
  const series: ChartSeries[] = [
    { id: "body", name: "Peso corporal", color: colors.text, primary: true, points: filter(bodyWeightProgress(state)) },
    ...selected.map(id => ({ id, name: displayName(id, state.preferences), color: palette[ids.indexOf(id) % palette.length], points: filter(exerciseProgress(state.history, id)) })),
  ];
  const score = scoreProgress(state);
  return <>
    <Txt weight="600" size={22}>Gráficas</Txt>
    <Row style={{ flexWrap: "wrap" }}>
      {(["month", "year", "all"] as const).map(value => <Button
        key={value}
        label={value === "month" ? "Este mes" : value === "year" ? "Este año" : "Todo el historial"}
        compact
        variant={period === value ? "primary" : "secondary"}
        onPress={() => setPeriod(value)}
      />)}
    </Row>
    <LineChart key={period} title="Peso corporal y cargas de entrenamiento" series={series} />
    <Card>
      <Txt weight="600">Ejercicios por grupo muscular</Txt>
      <Txt muted size={13}>Activa varios ejercicios para superponer sus líneas. El peso corporal permanece visible.</Txt>
      {muscles.filter(m => m.id !== "balanced").map(muscle => {
        const group = ids.filter(id => exercises.find(e => e.id === id)?.muscle === muscle.id);
        return group.length ? <View key={muscle.id} style={{ gap: 8 }}>
          <Txt weight="600">{muscle.name}</Txt>
          {group.map(id => <Choice key={id} title={displayName(id, state.preferences)}
            description={exerciseProgress(state.history, id).length ? "Carga máxima registrada · kg" : "Todavía sin registros"}
            selected={selected.includes(id)} onPress={() => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])} multiple />)}
        </View> : null;
      })}
      {!!selected.length && <Button label="Ocultar todos los ejercicios" compact variant="ghost" onPress={() => setSelected([])} />}
    </Card>
    <Card>
      <Txt weight="600">Registrar peso corporal</Txt>
      <Field label="Peso corporal de hoy" value={weight} onChangeText={value => { setWeight(value); setError(""); setMessage(""); }} numeric suffix="kg" error={error} />
      <Button label="Guardar peso corporal" variant="secondary" onPress={() => {
        const value = number(weight);
        if (!Number.isFinite(value) || value < 30 || value > 350) { setError("Introduce un peso entre 30 y 350 kg."); return; }
        update(s => ({ ...s, profile: { ...s.profile, weight }, bodyWeights: [...(s.bodyWeights ?? []), { date: new Date().toISOString(), weight: value }] }));
        setMessage("Peso corporal guardado.");
      }} />
      {!!message && <Notice>{message}</Notice>}
    </Card>
    <Card>
      <Txt weight="600" size={18}>Puntuación total</Txt>
      <Txt size={32} weight="600">{score.points.at(-1)?.value.toLocaleString("es", { maximumFractionDigits: 1 }) ?? "—"}<Txt muted size={14}> puntos</Txt></Txt>
      <Txt muted size={13}>Experimental: 100 × media de carga / peso corporal de cada sesión. {score.exercises.length} ejercicios comparables. Se mantiene una base fija de ejercicios para evitar saltos al cambiar el entrenamiento.</Txt>
      <Txt muted size={12}>Incluye peso libre del catálogo y máquinas homologadas. Las mancuernas se registran por unidad. La fórmula definitiva y la escala de niveles siguen pendientes.</Txt>
    </Card>
    <LineChart key={`score-${period}`} title="Evolución de la puntuación" unit="puntos" series={[{ id: "score", name: "Puntuación total", color: colors.accent, points: filter(score.points) }]} />
  </>;
}
