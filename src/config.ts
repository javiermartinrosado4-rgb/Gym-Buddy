import brand from "../brand.json";
export const APP = {
  ...brand,
  storageKey: "gym60:state:v1",
  maxMinutes: 60,
  maxDays: 5,
  defaultSets: 2,
} as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const copy = {
  twoSets:
    "Series distribuidas según tu objetivo semanal. Descansa entre 3 y 5 minutos; 5 minutos en ejercicios pesados.",
  extraSet:
    "Ajusta las series teniendo en cuenta el volumen semanal de este grupo muscular.",
  duration:
    "La estimación incluye calentamiento, aproximaciones, ejecución, descansos y cambios de ejercicio. El tiempo real depende de tu ritmo y de la espera en el gimnasio.",
  photo:
    "Es una estimación estética, no una medición médica. Esta demostración devuelve un resultado ficticio: no analiza tu cuerpo.",
  local:
    "Tus respuestas y preferencias se conservan en este navegador. No necesitas una cuenta.",
};
