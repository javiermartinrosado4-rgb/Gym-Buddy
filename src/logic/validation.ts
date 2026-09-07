import { messages } from "../content/es";
import { Profile, Range } from "../types";
export const number = (value: string) =>
  value.trim() === "" ? NaN : Number(value.replace(",", "."));
export const validWeight = (value: number) =>
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1000 &&
  Math.abs(value * 4 - Math.round(value * 4)) < 0.00001;
export const validRange = (range: Range) =>
  range.every(Number.isInteger) &&
  range[0] >= 1 &&
  range[1] >= range[0] &&
  range[1] <= 30;
export function profileErrors(p: Profile): Record<string, string> {
  const errors: Record<string, string> = {};
  if ((p.name?.trim().length ?? 0) > 60) errors.name = "Usa un nombre de hasta 60 caracteres.";
  if (p.handle && !/^[a-zA-Z0-9_]{3,24}$/.test(p.handle)) errors.handle = "Usa de 3 a 24 letras, números o guiones bajos, sin @.";
  if (p.mesocycle && (p.level !== "advanced" || p.priority === "balanced")) errors.mesocycle = "El mesociclo requiere nivel avanzado y un músculo prioritario.";
  if (
    p.trainingDays !== undefined &&
    (new Set(p.trainingDays).size !== p.days ||
      p.trainingDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7))
  )
    errors.trainingDays = `Selecciona exactamente ${p.days} días de la semana.`;
  if (!p.sex) errors.sex = messages.validation.seleccionaUnaOpcion;
  if (
    !Number.isInteger(number(p.age)) ||
    number(p.age) < 13 ||
    number(p.age) > 100
  )
    errors.age = messages.validation.introduceUnaEdadEntre13Y100;
  if (
    !Number.isFinite(number(p.height)) ||
    number(p.height) < 100 ||
    number(p.height) > 250
  )
    errors.height = messages.validation.introduceUnaAlturaEntre100Y250;
  if (
    !Number.isFinite(number(p.weight)) ||
    number(p.weight) < 30 ||
    number(p.weight) > 350
  )
    errors.weight = messages.validation.introduceUnPesoEntre30Y350;
  if (
    p.fatMode !== "unknown" &&
    (!Number.isFinite(number(p.bodyFat)) ||
      number(p.bodyFat) < 3 ||
      number(p.bodyFat) > 65)
  )
    errors.bodyFat = messages.validation.introduceUnPorcentajeEntre3Y65;
  if (p.fatMode === "photo" && (number(p.age) <= 18 || !p.photoConfirmed))
    errors.photo = messages.validation.laSimulacionRequiereMasDe18Anos;
  return errors;
}
