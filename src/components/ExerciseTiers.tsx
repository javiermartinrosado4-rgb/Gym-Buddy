import { useState } from "react";
import { View } from "react-native";
import { catalog } from "../data/catalog";
import { muscles, levelName } from "../data/options";
import { ExerciseTier, Muscle } from "../types";
import { Button, Card, Notice, Txt } from "./ui";

export function ExerciseTiers() {
  const [muscle, setMuscle] = useState<Muscle>("chest");
  const group = catalog.filter(e => e.muscle === muscle).sort((a, b) => a.priority - b.priority);
  const tiers: ExerciseTier[] = ["S+", "S", "A", "B"];
  return <Card>
    <Txt weight="600" size={20}>Tiers de ejercicios</Txt>
    <Notice>Guía orientativa para generar rutinas. No limita las ediciones: la técnica, la comodidad y el equipamiento pueden cambiar cuál es tu mejor opción.</Notice>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {muscles.filter(m => m.id !== "balanced").map(m => <Button key={m.id} compact label={`Tier ${m.name}`} variant={muscle === m.id ? "primary" : "secondary"} onPress={() => setMuscle(m.id as Muscle)} />)}
    </View>
    {tiers.map((tier) => {
      const entries = group.filter(e => e.tier === tier);
      return <View key={tier} style={{ gap: 8 }}>
        <Txt weight="600">{tier} · {tier === "S+" ? "Máxima prioridad" : tier === "S" ? "Prioridad alta" : tier === "A" ? "Alternativas preferentes" : "Otras opciones"}</Txt>
        {entries.length ? entries.map(e => <View key={e.id} style={{ gap: 3 }}><Txt>{e.name}</Txt><Txt muted size={12}>{e.equipment} · desde {levelName(e.minLevel).toLowerCase()}</Txt></View>) : <Txt muted size={12}>Sin ejercicios en este tier.</Txt>}
      </View>;
    })}
    <Txt muted size={12}>Los tiers no restringen tu rutina ni puntúan ejercicios personalizados.</Txt>
  </Card>;
}
