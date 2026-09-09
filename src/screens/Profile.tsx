import { messages } from "../content/es";
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import {
  Button,
  Card,
  Choice,
  Heading,
  Notice,
  Page,
  Txt,
} from "../components/ui";
import {
  DaysSelect,
  LevelSelect,
  PrioritySelect,
} from "../components/Selections";
import { ProfileFields } from "../components/ProfileFields";
import { TrainingPreferences } from "../components/TrainingPreferences";
import { useStore } from "../state/Store";
import { Profile as ProfileType } from "../types";
import { levelName, muscleName, variants } from "../data/options";
import { displayName, generateRoutine } from "../logic/routine";
import { number, profileErrors } from "../logic/validation";
import { availableWeekdays, localDateKey, weekdayName } from "../logic/schedule";
import { Avatar, AvatarSelect } from "../components/Avatar";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { ExerciseTiers } from "../components/ExerciseTiers";
export default function Profile() {
  const { state, update } = useStore();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(state.profile);
  const [prefs, setPrefs] = useState(state.preferences);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const change = (p: Partial<ProfileType>) => {
    setProfile((old) => ({ ...old, ...p }));
    setErrors({});
  };
  const save = () => {
    const found = profileErrors(profile);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    if (!prefs.equipment.length) {
      setMessage(messages.Profile.seleccionaAlMenosUnTipoDeEquipamiento);
      return;
    }
    const planChanged = ["sex", "level", "days", "priority", "includeGlutes"].some(key => profile[key as keyof ProfileType] !== state.profile[key as keyof ProfileType])
      || JSON.stringify(profile.trainingDays) !== JSON.stringify(state.profile.trainingDays)
      || JSON.stringify(prefs) !== JSON.stringify(state.preferences);
    update((s) => ({
      ...s,
      profile,
      programRevision: planChanged ? 6 : s.programRevision,
      preferences: prefs,
      bodyWeights: number(s.profile.weight) === number(profile.weight) && s.bodyWeights?.length
        ? s.bodyWeights : [...(s.bodyWeights ?? []), { date: new Date().toISOString(), weight: number(profile.weight) }],
      routine: planChanged ? generateRoutine(profile, prefs, s.volumeTargets) : s.routine,
      plannedWorkouts: planChanged ? (s.plannedWorkouts ?? []).filter(item => new Date(item.date) < new Date(new Date().setHours(0, 0, 0, 0))) : s.plannedWorkouts,
      skippedWorkoutDates: planChanged ? (s.skippedWorkoutDates ?? []).filter(date => date < localDateKey(new Date())) : s.skippedWorkoutDates,
    }));
    setEditing(false);
    setMessage(planChanged ? "Perfil actualizado y rutina regenerada. La sesión en curso conserva sus ejercicios." : "Datos personales actualizados.");
  };
  return (
    <Page>
      <Heading
        eyebrow={messages.Profile.tuEspacio}
        title={messages.Profile.todoEmpiezaContigo}
        subtitle={messages.Profile.unPlanQuePuedeCambiarAMedida}
      />
      {!editing ? (
        <>
          <Card>
            <Avatar id={state.profile.avatar} />
            <Txt size={24} weight="600">{state.profile.name || "Tu perfil"}</Txt>
            {!!state.profile.handle && <Txt muted>@{state.profile.handle}</Txt>}
            <Txt size={22} weight="600">
              {levelName(state.profile.level)}
            </Txt>
            <Txt>
              {state.routine.length}
              {messages.Profile.dias}
              {state.profile.priority === "balanced"
                ? muscleName(state.profile.priority)
                : `Mesociclo: ${muscleName(state.profile.priority)}`}
            </Txt>
            <Txt size={13} muted>
              Disponibilidad: {availableWeekdays(state.profile).map(weekdayName).join(", ")}
            </Txt>
            <Button
              label={messages.Profile.editarPerfilYGimnasio}
              variant="secondary"
              icon="edit-2"
              onPress={() => {
                setProfile(state.profile);
                setPrefs(state.preferences);
                setMessage("");
                setEditing(true);
              }}
            />
            {state.active && (
              <Txt size={12} muted>
                Puedes editar tu perfil durante la sesión; sus ejercicios y cargas se conservan hasta terminarla.
              </Txt>
            )}
          </Card>
          <Button label="Cerrar sesión" variant="secondary" icon="log-out" onPress={() => {
            update(s => ({ ...s, signedOut: true }));
            router.replace("/");
          }} />
          <GoogleSignIn />
          <Txt muted size={12}>Tu rutina e historial se conservan en este dispositivo. La cuenta de Comunidad admite Google o contraseña.</Txt>
          <Button
            label={messages.Profile.configuracionYApariencia}
            variant="secondary"
            icon="settings"
            onPress={() => router.push("/settings")}
          />
          <Card>
            <Txt weight="600">{messages.Profile.preferenciasGuardadas}</Txt>
            <Txt size={13} muted>
              {state.preferences.unavailable.length}
              {messages.Profile.ejerciciosNoDisponibles}
              {state.preferences.custom.length}
              {messages.Profile.ejerciciosPersonalizados}
            </Txt>
            <Txt size={13} muted>
              {messages.Profile.lasCargasConfirmadasLosNombresYLos}
            </Txt>
          </Card>
          <Card>
            <Txt weight="600">Asistente IA y estimación de grasa</Txt>
            <Txt muted size={13}>Integración pendiente. Todavía no hay conexión con tu ChatGPT personal ni análisis real de fotografías. La demostración fotográfica sigue siendo simulada.</Txt>
          </Card>
        </>
      ) : (
        <>
          <Notice>
            Los cambios personales conservan tu rutina. Cambiar nivel, disponibilidad, prioridad o equipamiento regenera el plan.
          </Notice>
          <ProfileFields profile={profile} change={change} errors={errors} />
          <AvatarSelect value={profile.avatar} onChange={avatar => change({ avatar })} />
          <Txt weight="600">{messages.Profile.nivel}</Txt>
          <LevelSelect profile={profile} change={change} />
          <Txt weight="600">{messages.Profile.disponibilidad}</Txt>
          <DaysSelect profile={profile} change={change} />
          {!!errors.trainingDays && <Notice error>{errors.trainingDays}</Notice>}
          <Txt weight="600">{messages.Profile.musculoPrioritario}</Txt>
          <PrioritySelect profile={profile} change={change} />
          <TrainingPreferences profile={profile} change={change} />
          <Txt weight="600">{messages.Profile.equipamientoDeTuGimnasio}</Txt>
          {variants.map((v) => (
            <Choice
              multiple
              key={v.id}
              title={v.name}
              selected={prefs.equipment.includes(v.id)}
              onPress={() =>
                setPrefs((p) => ({
                  ...p,
                  equipment: p.equipment.includes(v.id)
                    ? p.equipment.filter((id) => id !== v.id)
                    : [...p.equipment, v.id],
                }))
              }
            />
          ))}
          {!!prefs.unavailable.length && (
            <>
              <Txt weight="600">
                {messages.Profile.ejerciciosQueHasDescartado}
              </Txt>
              {prefs.unavailable.map((id) => (
                <View key={id} style={{ gap: 5 }}>
                  <Txt size={13}>{displayName(id, prefs)}</Txt>
                  <Button
                    label={`Volver a permitir ${displayName(id, prefs)}`}
                    compact
                    variant="secondary"
                    onPress={() =>
                      setPrefs((p) => ({
                        ...p,
                        unavailable: p.unavailable.filter(
                          (item) => item !== id,
                        ),
                      }))
                    }
                  />
                </View>
              ))}
            </>
          )}
          <ExerciseTiers preferences={prefs} setPreferences={setPrefs} />
          {!!Object.keys(errors).length && (
            <Notice error>
              {messages.Profile.revisaLosCamposIndicadosEnElPerfil}
            </Notice>
          )}
          <Button
            label="Guardar perfil"
            onPress={save}
          />
          <Button
            label={messages.Profile.cancelarEdicion}
            variant="ghost"
            onPress={() => {
              setEditing(false);
              setErrors({});
              setMessage("");
            }}
          />
        </>
      )}
      {!!message && <Notice>{message}</Notice>}
      <Txt size={12} muted>
        {messages.Profile.almacenamientoLocalSinCuentasNiConexionA}
      </Txt>
    </Page>
  );
}
