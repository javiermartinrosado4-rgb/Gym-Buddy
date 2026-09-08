export interface MotivationalQuote {
  text: string;
  author?: string;
}

// A small, varied rotation: effort, consistency and growth without turning the
// training screen into a wall of slogans.
export const motivationalQuotes: MotivationalQuote[] = [
  { text: "Cuando el fracaso es una opción, eventualmente se convierte en consecuencia.", author: "Javi" },
  { text: "El caer no quita la gloria de haber subido." },
  { text: "Si solo haces lo que sabes hacer, jamás serás más de lo que eres hoy." },
  { text: "No temes a fallar. Temes que vean tus fallos." },
  { text: "El paso más importante que puede dar un hombre es el siguiente.", author: "Dalinar Kholin" },
  { text: "Envidia a nadie: aquello que ves tuvo un precio." },
  { text: "Cuando uno hace todo lo que puede, no está obligado a más." },
  { text: "La comodidad es la peor adicción.", author: "Marco Aurelio" },
  { text: "La estructura vale más que la disciplina." },
  { text: "No te disculpes. Mejora." },
  { text: "No puedes controlar el viento, pero sí ajustar tus velas." },
  { text: "Lo que hoy pesa, mañana será parte de tu base." },
];

/** A deterministic daily choice keeps the phrase steady while navigating. */
export const motivationalQuoteForDate = (date = new Date()) => {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const index = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0) % motivationalQuotes.length;
  return motivationalQuotes[index];
};
