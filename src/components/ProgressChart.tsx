import { useState } from "react";
import { Pressable, View } from "react-native";
import { ChartPoint } from "../logic/progress";
import { useTheme } from "../theme";
import { Card, Txt } from "./ui";
export function ProgressChart({ title, points, unit }: { title: string; points: ChartPoint[]; unit: string }) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const recent = points.slice(-10);
  const max = Math.max(1, ...recent.map(p => p.value));
  const current = recent[selected ?? recent.length - 1] ?? recent.at(-1);
  return <Card>
    <Txt weight="600" size={18}>{title}</Txt>
    {!current ? <Txt muted size={13}>Sin datos registrados todavía.</Txt> : <>
      <Txt size={26}>{current.value.toLocaleString("es", { maximumFractionDigits: 2 })} {unit}</Txt>
      <Txt muted size={12}>{new Date(current.date).toLocaleString("es")} {current.detail ? `· ${current.detail}` : ""}</Txt>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 140, gap: 6 }}>
        {recent.map((point, i) => <Pressable key={`${point.date}-${i}`} accessibilityRole="button"
          accessibilityLabel={`${title}: ${point.value} ${unit}, ${new Date(point.date).toLocaleDateString("es")}`}
          accessibilityState={{ selected: point === current }} onPress={() => setSelected(i)}
          style={{ flex: 1, height: 140, justifyContent: "flex-end", minWidth: 18 }}>
          <View style={{ height: Math.max(4, point.value / max * 115), backgroundColor: point === current ? colors.accent : colors.muted, borderRadius: 4 }} />
          <Txt size={9} muted style={{ textAlign: "center" }}>{new Date(point.date).getDate()}/{new Date(point.date).getMonth() + 1}</Txt>
        </Pressable>)}
      </View>
      <Txt muted size={11}>Escala desde 0 hasta {max.toLocaleString("es", { maximumFractionDigits: 2 })} {unit} · últimas {recent.length} mediciones. Toca una barra para consultar el dato.</Txt>
    </>}
  </Card>;
}
