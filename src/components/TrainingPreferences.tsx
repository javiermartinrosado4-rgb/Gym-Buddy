import { Profile } from "../types";
import { glutesEnabled } from "../logic/routine";
import { Choice, Notice } from "./ui";

export function TrainingPreferences({ profile, change }: { profile: Profile; change: (patch: Partial<Profile>) => void }) {
  return <>
    <Choice multiple title="Incluir ejercicios especificos de gluteos"
      description="Puedes cambiarlo siempre o anadirlos desde tu rutina de pierna."
      selected={glutesEnabled(profile)} onPress={() => change({ includeGlutes: !glutesEnabled(profile) })} />
    <Notice>Consejo de recuperacion: intenta dejar unas 72 horas entre el trabajo directo de un mismo grupo muscular y volver a entrenarlo.</Notice>
  </>;
}
