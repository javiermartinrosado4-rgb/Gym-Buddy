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
    "Series distribuidas según tu objetivo semanal. Descansa 4 minutos en ejercicios pesados y 3 minutos en los demás.",
  extraSet:
    "Ajusta las series teniendo en cuenta el volumen semanal de este grupo muscular.",
  duration:
    "La estimación suma 30 segundos por serie efectiva y los descansos entre series. Calentamiento, aproximaciones y esperas del gimnasio van aparte.",
  photo:
    "Es una estimación estética, no una medición médica. Esta demostración devuelve un resultado ficticio: no analiza tu cuerpo.",
  local:
    "Tus respuestas y preferencias se conservan en este dispositivo. No necesitas una cuenta.",
};
