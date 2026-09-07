import { Profile } from "../types";
import { glutesEnabled } from "../logic/routine";
import { Choice, Notice } from "./ui";
export function TrainingPreferences({ profile, change }: { profile: Profile; change: (patch: Partial<Profile>) => void }) {
  return <>
    <Choice multiple title="Incluir ejercicios específicos de glúteos"
      description="Puedes cambiarlo siempre o añadirlos desde tu rutina de pierna."
      selected={glutesEnabled(profile)} onPress={() => change({ includeGlutes: !glutesEnabled(profile) })} />
    {profile.level === "advanced" && <Choice multiple title="Mesociclo de especialización"
      description="16 series semanales del músculo que selecciones como prioritario."
      selected={!!profile.mesocycle} onPress={() => change({ mesocycle: !profile.mesocycle })} />}
    {profile.mesocycle && profile.priority === "balanced" && <Notice>Selecciona un músculo prioritario para el mesociclo.</Notice>}
  </>;
}
