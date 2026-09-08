import { ChartPoint } from "../logic/progress";
import { useTheme } from "../theme";
import { LineChart } from "./LineChart";
export function ProgressChart({ title, points, unit }: { title: string; points: ChartPoint[]; unit: string }) {
  const { colors } = useTheme();
  return <LineChart title={title} unit={unit} series={[{ id: "progress", name: title, color: colors.accent, points }]} />;
}
