import { Workout } from "../types";
import { estimateCalories } from "../logic/calories";
import { Card, Txt } from "./ui";

export function Calories({ workout }: { workout: Workout }) {
  const calories = estimateCalories(workout);
  return <Card>
    <Txt weight="600" size={22}>{calories === null ? "Calorías no disponibles" : `≈ ${calories} kcal`}</Txt>
    <Txt muted size={12}>{calories === null ? "Esta sesión no tiene un peso corporal registrado." : "Gasto total aproximado según tu peso al empezar, los ejercicios y las series realizadas. Incluye descansos estimados de 3–5 min y 3 s por repetición; no es una medición. No cuenta los ejercicios omitidos."}</Txt>
  </Card>;
}
