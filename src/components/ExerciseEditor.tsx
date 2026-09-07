import { messages } from "../content/es";
import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Choice, Field, Notice, Row, Txt } from "./ui";
import { useStore } from "../state/Store";
import {
  candidates,
  canPlaceExercise,
  displayName,
  exerciseLimit,
  fitDay,
  getExercise,
  prescribe,
} from "../logic/routine";
import { number, validRange, validWeight } from "../logic/validation";
import { copy } from "../config";
import {
  Exercise,
  ExerciseType,
  Muscle,
  Prescription,
  Range,
  Variant,
} from "../types";
import { muscles, variants } from "../data/options";
export function ExerciseEditor({
  dayId,
  prescription,
  close,
  report,
}: {
  dayId: string;
  prescription?: Prescription;
  close: () => void;
  report: (text: string) => void;
}) {
  const { state, update } = useStore();
  const prefs = state.preferences;
  const original = prescription
    ? getExercise(prescription.exerciseId, prefs)
    : undefined;
  const [mode, setMode] = useState<"edit" | "pick" | "custom">(
    original ? "edit" : "pick",
  );
  const [name, setName] = useState(
    original ? displayName(original.id, prefs) : "",
  );
  const [weight, setWeight] = useState(String(prescription?.weight ?? 0));
  const [sets, setSets] = useState(String(prescription?.sets ?? 2));
  const [min, setMin] = useState(String(prescription?.range[0] ?? 8));
  const [max, setMax] = useState(String(prescription?.range[1] ?? 10));
  const [muscle, setMuscle] = useState<Muscle>(original?.muscle ?? "chest");
  const [type, setType] = useState<ExerciseType>("isolation");
  const [variant, setVariant] = useState<Variant>(
    prefs.equipment.includes("machine")
      ? "machine"
      : (prefs.equipment[0] ?? "machine"),
  );
  const [error, setError] = useState("");
  const [loadStep, setLoadStep] = useState(String(original ? prefs.loadSteps?.[original.id] ?? original.loadStep ?? 1.25 : 1.25));
  const full = !prescription && (state.routine.find(d => d.id === dayId)?.exercises.length ?? 0) >= exerciseLimit(state.profile.level);
  const day = state.routine.find((d) => d.id === dayId)!;
  const canAdd = (exercise: Exercise) =>
    canPlaceExercise(day, exercise, prefs, state.profile.days, prescription?.id);
  const apply = (exercise: Exercise, unavailable = false) => {
    if (full) return setError(`Máximo ${exerciseLimit(state.profile.level)} ejercicios por sesión. Sustituye uno existente.`);
    if (!canAdd(exercise)) return setError("En rutinas de más de 3 días hay un máximo de 2 ejercicios pesados por sesión.");
    update((s) => {
      const preferences = {
        ...s.preferences,
        unavailable:
          unavailable && original
            ? [...new Set([...s.preferences.unavailable, original.id])]
            : s.preferences.unavailable,
      };
      const routine = s.routine.map((d) => {
        let entries = d.exercises;
        if (unavailable && original)
          entries = entries.flatMap((p) => {
            if (p.exerciseId !== original.id) return [p];
            const replacement = candidates(
              original.muscle,
              s.profile,
              preferences,
            ).find(
              (e) =>
                !entries.some(
                  (other) => other.id !== p.id && other.exerciseId === e.id,
                ),
            );
            return replacement
              ? [prescribe(replacement, preferences, p.id)]
              : [];
          });
        else if (d.id === dayId)
          entries = prescription
            ? entries.map((p) =>
                p.id === prescription.id
                  ? prescribe(exercise, preferences, p.id)
                  : p,
              )
            : [
                ...entries,
                prescribe(
                  exercise,
                  preferences,
                  `${Date.now()}-${exercise.id}`,
                ),
              ];
        return fitDay(
          { ...d, exercises: entries },
          preferences,
          d.id === dayId ? (prescription?.id ?? entries.at(-1)?.id) : undefined,
          s.profile.level,
        );
      });
      return { ...s, preferences, routine };
    });
    report(
      unavailable
        ? messages.ExerciseEditor
            .preferenciaGuardadaHemosSustituidoEsteEjercicioEn
        : messages.ExerciseEditor
            .ejercicioGuardadoElPlanSeAjustaAutomaticamente,
    );
    close();
  };
  const unavailable = () => {
    if (!original) return;
    const next = candidates(original.muscle, state.profile, prefs).find(
      (e) => e.id !== original.id,
    );
    if (next) apply(next, true);
    else {
      update((s) => ({
        ...s,
        preferences: {
          ...s.preferences,
          unavailable: [
            ...new Set([...s.preferences.unavailable, original.id]),
          ],
        },
        routine: s.routine.map((d) => ({
          ...d,
          exercises: d.exercises.filter((p) => p.exerciseId !== original.id),
        })),
      }));
      report(
        messages.ExerciseEditor.noQuedanSustitucionesCompatiblesParaEsteMusculo,
      );
      close();
    }
  };
  const save = () => {
    if (full) return setError(`Máximo ${exerciseLimit(state.profile.level)} ejercicios por sesión.`);
    if (![1.25, 2.5, 5, 10, 20].includes(number(loadStep))) return setError("Selecciona un incremento disponible.");
    const range: Range = [number(min), number(max)];
    const count = number(sets);
    const kg = number(weight);
    if (!name.trim())
      return setError(messages.ExerciseEditor.escribeUnNombreParaElEjercicio);
    if (!validWeight(kg))
      return setError(messages.ExerciseEditor.usaUnPesoEntre0Y1000);
    if (!validRange(range))
      return setError(messages.ExerciseEditor.elRangoDebeIrDeMenorA);
    if (!Number.isInteger(count) || count < 2 || count > 6)
      return setError(messages.ExerciseEditor.puedesProgramarEntre2Y6Series);
    const exercise: Exercise =
      mode === "custom"
        ? {
            id: `custom-${Date.now()}`,
            name: name.trim(),
            muscle,
            type,
            variant,
            equipment: variants.find((v) => v.id === variant)!.name,
            minLevel: variant === "free" ? "intermediate" : "beginner",
            priority: 100,
            secondary: [],
            range,
            substitutions: [],
            custom: true,
          }
        : original!;
    if (
      mode === "custom" &&
      variant === "free" &&
      state.profile.level === "beginner"
    )
      return setError(
        messages.ExerciseEditor.losEjerciciosPersonalizadosDePesoLibreRequieren,
      );
    if (mode === "custom" && !prefs.equipment.includes(variant))
      return setError(
        messages.ExerciseEditor.eligeUnEquipamientoDisponibleEnTuGimnasio,
      );
    const preferences = {
      ...prefs,
      loadSteps: { ...prefs.loadSteps, [exercise.id]: number(loadStep) },
      names: { ...prefs.names, [exercise.id]: name.trim() },
      weights: { ...prefs.weights, [exercise.id]: kg },
      ranges: { ...prefs.ranges, [exercise.id]: range },
      custom: mode === "custom" ? [...prefs.custom, exercise] : prefs.custom,
    };
    const entry: Prescription = {
      id: prescription?.id ?? `${Date.now()}-${exercise.id}`,
      exerciseId: exercise.id,
      sets: count,
      weight: kg,
      range,
    };
    const edited = {
      ...day,
      exercises: prescription
        ? day.exercises.map((p) => (p.id === prescription.id ? entry : p))
        : [...day.exercises, entry],
    };
    if (!canPlaceExercise(day, exercise, prefs, state.profile.days, prescription?.id))
      return setError("En rutinas de más de 3 días hay un máximo de 2 ejercicios pesados por sesión.");
    const fitted = fitDay(edited, preferences, entry.id, state.profile.level);
    update((s) => ({
      ...s,
      preferences,
      routine: s.routine.map((d) =>
        d.id === dayId
          ? fitted
          : fitDay(
              {
                ...d,
                exercises: d.exercises.map((p) =>
                  p.exerciseId === exercise.id
                    ? { ...p, weight: kg, range }
                    : p,
                ),
              },
              preferences,
              undefined,
              state.profile.level,
            ),
      ),
    }));
    const removed = edited.exercises.length - fitted.exercises.length;
    report(
      removed
        ? `Cambios guardados. Se han retirado ${removed} ejercicios para respetar el límite de tu nivel.`
        : messages.ExerciseEditor.cambiosYPreferenciasGuardados,
    );
    close();
  };
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt weight="600">
          {mode === "edit"
            ? messages.ExerciseEditor.ajustarEjercicio
            : mode === "custom"
              ? messages.ExerciseEditor.tuPropioEjercicio
              : messages.ExerciseEditor.elegirEjercicio}
        </Txt>
        <Button
          label={messages.ExerciseEditor.cerrar}
          compact
          variant="ghost"
          onPress={close}
        />
      </Row>
      {mode === "edit" && (
        <>
          <Field
            label={messages.ExerciseEditor.nombreDelEjercicio}
            value={name}
            onChangeText={setName}
          />
          <Row style={{ alignItems: "flex-start" }}>
            <Field
              label={messages.ExerciseEditor.pesoInicial}
              value={weight}
              onChangeText={setWeight}
              numeric
              suffix={messages.ExerciseEditor.kg}
            />
            <Field
              label={messages.ExerciseEditor.seriesEfectivas}
              value={sets}
              onChangeText={setSets}
              numeric
            />
          </Row>
          <Row>
            <Field
              label={messages.ExerciseEditor.repeticionesMinimas}
              value={min}
              onChangeText={setMin}
              numeric
            />
            <Field
              label={messages.ExerciseEditor.repeticionesMaximas}
              value={max}
              onChangeText={setMax}
              numeric
            />
          </Row>
          {number(sets) > 2 && <Notice>{copy.extraSet}</Notice>}
          <Button
            label={messages.ExerciseEditor.guardarCambios}
            onPress={save}
          />
          <Button
            label={messages.ExerciseEditor.sustituirEjercicio}
            variant="secondary"
            icon="repeat"
            onPress={() => setMode("pick")}
          />
          <Button
            label={messages.ExerciseEditor.miGimnasioNoLoTiene}
            variant="ghost"
            icon="slash"
            onPress={unavailable}
          />
        </>
      )}
      {mode === "pick" && (
        <>
          {!prescription && (
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {muscles
                .filter((m) => m.id !== "balanced")
                .map((m) => (
                  <Button
                    key={m.id}
                    compact
                    label={m.name}
                    variant={muscle === m.id ? "primary" : "secondary"}
                    onPress={() => setMuscle(m.id as Muscle)}
                  />
                ))}
            </View>
          )}
          <Txt muted size={13}>
            {messages.ExerciseEditor.porPrioridadCompatiblesConTuNivelY}
          </Txt>
          {candidates(muscle, state.profile, prefs)
            .filter(
              (e) =>
                e.id !== original?.id &&
                canAdd(e) &&
                !state.routine
                  .find((d) => d.id === dayId)
                  ?.exercises.some(
                    (p) => p.exerciseId === e.id && p.id !== prescription?.id,
                  ),
            )
            .map((e) => (
              <Choice
                key={e.id}
                title={displayName(e.id, prefs)}
                description={`${e.type === "compound" ? messages.ExerciseEditor.multiarticular : messages.ExerciseEditor.aislamiento} · ${e.equipment}`}
                selected={false}
                onPress={() => apply(e)}
              />
            ))}
          {!candidates(muscle, state.profile, prefs).filter(
            (e) => e.id !== original?.id,
          ).length && (
            <Notice>
              {messages.ExerciseEditor.noHayMasOpcionesCompatiblesCreaUna}
            </Notice>
          )}
          <Button
            label={messages.ExerciseEditor.crearEjercicioPersonalizado}
            variant="secondary"
            icon="plus"
            onPress={() => {
              setMode("custom");
              setName("");
              setSets("2");
            }}
          />
        </>
      )}
      {mode === "custom" && (
        <>
          <Field
            label={messages.ExerciseEditor.nombreDelEjercicio}
            value={name}
            onChangeText={setName}
          />
          <Txt muted size={13}>
            {messages.ExerciseEditor.grupoMuscular}
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {muscles
              .filter((m) => m.id !== "balanced")
              .map((m) => (
                <Button
                  key={m.id}
                  label={m.name}
                  compact
                  variant={muscle === m.id ? "primary" : "secondary"}
                  onPress={() => setMuscle(m.id as Muscle)}
                />
              ))}
          </View>
          <Choice
            title={messages.ExerciseEditor.multiarticular}
            selected={type === "compound"}
            onPress={() => {
              setType("compound");
              setMin("6");
              setMax("8");
            }}
          />
          <Choice
            title={messages.ExerciseEditor.aislamiento}
            selected={type === "isolation"}
            onPress={() => {
              setType("isolation");
              setMin("8");
              setMax("10");
            }}
          />
          {variants.map((v) => (
            <Choice
              key={v.id}
              title={v.name}
              selected={variant === v.id}
              onPress={() => setVariant(v.id)}
              disabled={!prefs.equipment.includes(v.id)}
            />
          ))}
          <Row>
            <Field
              label={messages.ExerciseEditor.repeticionesMinimas}
              value={min}
              onChangeText={setMin}
              numeric
            />
            <Field
              label={messages.ExerciseEditor.repeticionesMaximas}
              value={max}
              onChangeText={setMax}
              numeric
            />
          </Row>
          <Field
            label={messages.ExerciseEditor.pesoInicial}
            value={weight}
            onChangeText={setWeight}
            numeric
            suffix={messages.ExerciseEditor.kg}
          />
          <Txt size={13} muted>
            {messages.ExerciseEditor.seGuardaraEnTuCatalogoCon2}
          </Txt>
          <Button
            label={messages.ExerciseEditor.guardarEjercicioPersonalizado}
            onPress={save}
          />
        </>
      )}
      {!!error && <Notice error>{error}</Notice>}
      <Txt weight="600">Incremento disponible de carga</Txt>
      <Txt size={12} muted>Para barras, indica el incremento total de ambos lados (dos discos de 1,25 = 2,5 kg). En mancuernas, registra el peso de una mancuerna. Se guarda con «Guardar cambios».</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {[1.25, 2.5, 5, 10, 20].map(step => <Button key={step} compact label={`${step} kg`} variant={number(loadStep) === step ? "primary" : "secondary"} onPress={() => setLoadStep(String(step))} />)}
      </View>
    </Card>
  );
}
