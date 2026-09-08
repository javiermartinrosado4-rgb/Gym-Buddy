import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { ChartPoint } from "../logic/progress";
import { useTheme } from "../theme";
import { Button, Card, Row, Txt } from "./ui";

export interface ChartSeries { id: string; name: string; color: string; points: ChartPoint[]; primary?: boolean }
const dateLabel = (time: number) => new Date(time).toLocaleDateString("es", { day: "numeric", month: "short" });

export function LineChart({ title, series, unit = "kg" }: { title: string; series: ChartSeries[]; unit?: string }) {
  const { colors } = useTheme();
  const [cursor, setCursor] = useState<number | null>(null);
  const [width, setWidth] = useState(320);
  const valid = series.map(s => ({ ...s, points: s.points.filter(p => Number.isFinite(p.value) && Number.isFinite(Date.parse(p.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date)) }));
  const points = valid.flatMap(s => s.points);
  const dates = [...new Set(points.map(p => Date.parse(p.date)))].sort((a, b) => a - b);
  const index = cursor === null ? dates.length - 1 : Math.min(cursor, dates.length - 1);
  const time = dates[index];
  const start = dates[0] ?? 0, end = dates.at(-1) ?? 0;
  const maximum = Math.max(1, Math.ceil(Math.max(0, ...points.map(p => p.value)) / 10) * 10);
  const x = (date: string | number) => 43 + ((typeof date === "string" ? Date.parse(date) : date) - start) / (end - start || 1) * (width - 60);
  const y = (value: number) => 200 - value / maximum * 175;
  return <Card>
    <Txt weight="600" size={18}>{title}</Txt>
    <Row style={{ flexWrap: "wrap" }}>
      {series.map(s => <Row key={s.id} style={{ gap: 6 }}><View style={{ width: 20, height: s.primary ? 4 : 2, backgroundColor: s.color }} /><Txt size={12}>{s.name}{s.primary ? " · siempre visible" : ""}</Txt></Row>)}
    </Row>
    {!points.length ? <Txt muted>Sin mediciones en este periodo. Registra tu peso corporal o completa un entrenamiento.</Txt> : <>
      <View onLayout={event => setWidth(Math.max(230, event.nativeEvent.layout.width))} testID="line-chart">
        <Svg width="100%" height={235} viewBox={`0 0 ${width} 235`} accessibilityRole="image" accessibilityLabel={`${title}. Gráfica de líneas en ${unit}, del ${dateLabel(start)} al ${dateLabel(end)}. Datos consultables debajo.`}>
          {[0, 0.25, 0.5, 0.75, 1].map(fraction => <Line key={`grid-${fraction}`} x1={43} x2={width - 17} y1={y(maximum * fraction)} y2={y(maximum * fraction)} stroke={colors.border} />)}
          {[0, 0.5, 1].map(fraction => <SvgText key={`label-${fraction}`} x={36} y={y(maximum * fraction) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{Math.round(maximum * fraction)}</SvgText>)}
          {valid.map(s => <Polyline key={s.id} points={s.points.map(p => `${x(p.date)},${y(p.value)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={s.primary ? 4 : 2} strokeLinejoin="round" />)}
          {valid.flatMap(s => s.points.map((p, i) => <Circle key={`${s.id}-${i}`} cx={x(p.date)} cy={y(p.value)} r={Date.parse(p.date) === time ? 5 : 3} fill={s.color} />))}
          <Line x1={x(time)} x2={x(time)} y1={20} y2={200} stroke={colors.muted} strokeDasharray="3 4" />
          <SvgText x={43} y={225} fontSize={10} fill={colors.muted}>{dateLabel(start)}</SvgText>
          <SvgText x={width - 17} y={225} fontSize={10} fill={colors.muted} textAnchor="end">{dateLabel(end)}</SvgText>
        </Svg>
      </View>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Button label="Medición anterior" compact variant="secondary" disabled={index <= 0} onPress={() => setCursor(index - 1)} />
        <Button label="Medición siguiente" compact variant="secondary" disabled={index >= dates.length - 1} onPress={() => setCursor(index + 1)} />
      </Row>
      <Txt weight="600" size={13}>{new Date(time).toLocaleString("es")}</Txt>
      {valid.map(s => {
        const atDate = s.points.filter(p => Date.parse(p.date) === time).at(-1);
        return <Txt key={s.id} size={13}>{s.name}: {atDate ? `${atDate.value.toLocaleString("es", { maximumFractionDigits: 2 })} ${unit}${atDate.detail ? ` · ${atDate.detail}` : ""}` : "sin medición en esta fecha"}</Txt>;
      })}
      <Txt muted size={11}>Escala común de 0 a {maximum} {unit}. Las líneas unen mediciones; no implican registros entre fechas.</Txt>
    </>}
  </Card>;
}
