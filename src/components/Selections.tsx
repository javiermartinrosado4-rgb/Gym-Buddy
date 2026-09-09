import { messages } from "../content/es";
import { View } from "react-native";
import { defaultTrainingDays, levels, muscles, weekdays } from "../data/options";
import { Profile, Weekday } from "../types";
import { Button, Choice, Notice, Txt } from "./ui";
export function LevelSelect({
  profile,
  change,
}: {
  profile: Profile;
  change: (p: Partial<Profile>) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {levels.map((l) => (
        <Choice
          key={l.id}
          title={l.name}
          description={l.description}
          selected={profile.level === l.id}
          onPress={() => change({ level: l.id })}
        />
      ))}
    </View>
  );
}
export function DaysSelect({
  profile,
  change,
}: {
  profile: Profile;
  change: (p: Partial<Profile>) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <View key={day} style={{ width: 48 }}>
            <Button
              label={String(day)}
              variant={profile.days === day ? "primary" : "secondary"}
              onPress={() => change({ days: day, trainingDays: defaultTrainingDays(day) })}
            />
          </View>
        ))}
      </View>
      <Txt weight="600">
        {profile.days}{" "}
        {profile.days === 1
          ? messages.Selections.diaDisponible
          : messages.Selections.diasDisponibles}
        {messages.Selections.porSemana}
      </Txt>
      <Txt weight="600">¿Qué días puedes entrenar?</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {weekdays.map((day) => {
          const selected = (profile.trainingDays ?? defaultTrainingDays(profile.days)).includes(day.id);
          const full = (profile.trainingDays ?? defaultTrainingDays(profile.days)).length >= profile.days;
          return (
            <View key={day.id} style={{ width: 92 }}>
              <Button
                label={day.name}
                compact
                variant={selected ? "primary" : "secondary"}
                disabled={!selected && full}
                onPress={() => {
                  const current = profile.trainingDays ?? defaultTrainingDays(profile.days);
                  change({
                    trainingDays: (selected
                      ? current.filter((id) => id !== day.id)
                      : [...current, day.id].sort((a, b) => a - b)) as Weekday[],
                  });
                }}
              />
            </View>
          );
        })}
      </View>
      <Txt size={12} muted>
        Seleccionados {(profile.trainingDays ?? defaultTrainingDays(profile.days)).length} de {profile.days}. Gym Buddy repartirá hasta 5 sesiones entre estos días.
      </Txt>
      {profile.days > 5 && (
        <Notice>
          {messages.Selections.recomendamosYProgramaremosUnMaximoDe5}
        </Notice>
      )}
    </View>
  );
}
export function PrioritySelect({
  profile,
  change,
}: {
  profile: Profile;
  change: (p: Partial<Profile>) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      {muscles.map((m) => (
        <Choice
          key={m.id}
          title={m.name}
          description={
            m.id === "balanced"
              ? messages.Selections.sinPrioridadConcreta
              : "Este músculo será tu mesociclo de especialización: aumenta sus series según tus días disponibles; desde 4 días se acerca a 16 series en nivel intermedio o avanzado."
          }
          selected={profile.priority === m.id}
          onPress={() => change({ priority: m.id, mesocycle: m.id !== "balanced" })}
        />
      ))}
    </View>
  );
}
