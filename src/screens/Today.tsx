import { messages } from "../content/es";
import { router } from "expo-router";
import { View } from "react-native";
import { APP, copy } from "../config";
import {
  Button,
  Card,
  Heading,
  Icon,
  Notice,
  Page,
  Pill,
  Row,
  Txt,
} from "../components/ui";
import { useStore } from "../state/Store";
import { displayName, duration } from "../logic/routine";
import { startWorkout } from "../logic/workout";
import {
  routineSchedule,
  scheduledDay,
  weekdayName,
  workoutsOnDate,
} from "../logic/schedule";
import {
  overallStats,
  workoutStats,
  workoutTrend,
} from "../logic/performance";
import { useTheme } from "../theme";

const formatNumber = (value: number) =>
  value.toLocaleString("es", { maximumFractionDigits: 0 });

export default function Today() {
  const { state, update } = useStore();
  const { colors } = useTheme();
  const now = new Date();
  const planned = scheduledDay(state.profile, state.routine, now);
  const todayWorkouts = workoutsOnDate(state.history, now);
  const completed = [...todayWorkouts]
    .reverse()
    .find((workout) =>
      planned
        ? workout.dayId === planned.id ||
          (!workout.dayId && workout.dayName === planned.name)
        : true,
    );
  const session = state.active?.day ?? (completed
    ? state.routine.find((day) => day.id === completed.dayId) ?? planned
    : planned);
  const latestStats = completed ? workoutStats(completed) : undefined;
  const trend = completed ? workoutTrend(completed, state.history) : undefined;
  const overall = overallStats(state.history);
  const schedule = routineSchedule(state.profile, state.routine);
  const nextPlanned = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() + offset + 1);
    return {
      date,
      item: schedule.find(
        ({ weekday }) =>
          weekday === (date.getDay() === 0 ? 7 : date.getDay()),
      ),
    };
  }).find(({ item }) => item);

  const trendMessage =
    trend?.status === "up"
      ? `Vas progresando: +${trend.percent}% en ${trend.compared} ejercicios comparables. Buen trabajo; mantén la constancia.`
      : trend?.status === "down"
        ? `Esta sesión ha bajado un ${Math.abs(trend.percent)}% en ${trend.compared} ejercicios comparables. Una sesión aislada no define tu progreso.`
        : trend?.status === "steady"
          ? `Rendimiento estable (${trend.percent >= 0 ? "+" : ""}${trend.percent}%) en ${trend.compared} ejercicios comparables. Sigue acumulando sesiones con buena técnica.`
          : "Primera referencia comparable de esta sesión. A partir de la próxima podrás ver la tendencia.";

  return (
    <Page>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt size={21} weight="600">{APP.name}</Txt>
        <Pill>{messages.Today.unPasoALaVez}</Pill>
      </Row>
      <Heading
        eyebrow={new Intl.DateTimeFormat("es", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(now)}
        title={
          state.active
            ? "Entrenamiento en curso"
            : completed
              ? "Sesión terminada"
              : planned
                ? "Esto es lo que toca hoy"
                : "Hoy toca recuperar"
        }
        subtitle={
          state.active
            ? "Puedes continuar exactamente donde lo dejaste."
            : completed
              ? "Aquí tienes el resumen de tu entrenamiento y tu tendencia."
              : planned
                ? `Tu calendario marca ${planned.name}.`
                : nextPlanned?.item
                  ? `Próxima sesión: ${weekdayName(nextPlanned.item.weekday)}, ${nextPlanned.item.day.name}.`
                  : "No hay una sesión programada para hoy."
        }
      />

      {session && (
        <Card
          style={{
            backgroundColor: colors.accentSoft,
            borderColor: colors.accentSoft,
            padding: 24,
          }}
        >
          <Pill>
            {state.active
              ? "SESIÓN EN CURSO"
              : completed
                ? "SESIÓN TERMINADA"
                : "SESIÓN DE HOY"}
          </Pill>
          <Txt size={34} weight="600">{session.name}</Txt>
          <Row>
            <Icon name="clock" size={16} />
            <Txt size={14}>
              {completed?.minutes ?? duration(session, state.preferences)} min
            </Txt>
            <Txt muted>·</Txt>
            <Txt size={14}>
              {completed?.records.length ?? session.exercises.length} ejercicios
            </Txt>
          </Row>
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 6,
            }}
          />
          {session.exercises.slice(0, 3).map((entry) => (
            <Row key={entry.id}>
              <Icon name="check" size={14} />
              <Txt size={13} style={{ flex: 1 }}>
                {displayName(entry.exerciseId, state.preferences)}
              </Txt>
            </Row>
          ))}
          {!completed && (
            <Button
              label={
                state.active
                  ? messages.Today.continuarEntrenamiento
                  : messages.Today.iniciarEntrenamiento
              }
              icon="play"
              disabled={!state.active && !session.exercises.length}
              onPress={() => {
                if (!state.active)
                  update((stateBeforeStart) => ({
                    ...stateBeforeStart,
                    active: startWorkout(
                      session,
                      stateBeforeStart.profile.weight,
                    ),
                  }));
                router.push("/workout");
              }}
            />
          )}
          <Button
            label={messages.Today.verMiRutinaCompleta}
            variant="ghost"
            compact
            onPress={() => router.replace("/routine")}
          />
        </Card>
      )}

      {!session && (
        <Card>
          <Pill>DÍA DE DESCANSO</Pill>
          <Txt weight="600" size={20}>No tienes entrenamiento programado hoy.</Txt>
          <Txt muted>
            Tu calendario se puede cambiar en Perfil. Para recuperarte, procura dormir 8 horas cada noche, acostándote y levantándote a los mismos horarios. Mantén una alimentación suficiente.
          </Txt>
          <Button
            label="Ver calendario semanal"
            variant="secondary"
            onPress={() => router.replace("/routine")}
          />
        </Card>
      )}

      {completed && latestStats && trend && (
        <>
          <Txt weight="600" size={18}>Tu último entrenamiento</Txt>
          <Row>
            <Card style={{ flex: 1 }}>
              <Txt size={26} weight="500">{latestStats.sets}</Txt>
              <Txt size={12} muted>series realizadas</Txt>
            </Card>
            <Card style={{ flex: 1 }}>
              <Txt size={26} weight="500">{latestStats.reps}</Txt>
              <Txt size={12} muted>repeticiones</Txt>
            </Card>
          </Row>
          <Card>
            <Txt size={28} weight="500">{formatNumber(latestStats.volume)}</Txt>
            <Txt size={12} muted>kg × repeticiones de volumen registrado</Txt>
            {!!completed.skipped?.length && (
              <Txt size={12} muted>
                Omitidos hoy: {completed.skipped.join(", ")}
              </Txt>
            )}
          </Card>
          <Notice>{trendMessage}</Notice>
          {trend.status === "down" && (
            <Card>
              <Txt weight="600" size={18}>Consejos para recuperarte</Txt>
              <Txt>
                Descanso: procura dormir 8 horas cada noche, acostándote y levantándote a los mismos horarios.
              </Txt>
              <Txt>
                Proteína: apunta a 1,8 gramos por kilo de peso corporal al día.
              </Txt>
              <Txt>
                Energía e hidratación: come suficiente para sostener tus entrenamientos y llega bien hidratado.
              </Txt>
              <Txt muted>
                Si la bajada de rendimiento se repite, revisa la fatiga acumulada y ajusta el plan.
              </Txt>
            </Card>
          )}
          <Txt weight="600" size={18}>Estadísticas generales</Txt>
          <Row>
            <Card style={{ flex: 1 }}>
              <Txt size={26} weight="500">{overall.sessions}</Txt>
              <Txt size={12} muted>sesiones</Txt>
            </Card>
            <Card style={{ flex: 1 }}>
              <Txt size={26} weight="500">{overall.sets}</Txt>
              <Txt size={12} muted>series totales</Txt>
            </Card>
          </Row>
          <Card>
            <Txt size={28} weight="500">{formatNumber(overall.volume)}</Txt>
            <Txt size={12} muted>kg × repeticiones acumulados</Txt>
            <Txt size={12} muted>
              La tendencia compara la mejor serie estimada de ejercicios comunes con la sesión anterior del mismo tipo. El volumen depende de cómo registres barras, máquinas y mancuernas.
            </Txt>
          </Card>
        </>
      )}

      {!completed && (
        <>
          <Row>
            <Card style={{ flex: 1 }}>
              <Txt size={30} weight="500">3–5</Txt>
              <Txt size={12} muted>minutos de descanso</Txt>
            </Card>
            <Card style={{ flex: 1 }}>
              <Txt size={30} weight="500">
                {state.profile.level === "beginner" ? 5 : 6}
              </Txt>
              <Txt size={12} muted>ejercicios como máximo</Txt>
            </Card>
          </Row>
          <Notice>{copy.twoSets}</Notice>
        </>
      )}
    </Page>
  );
}
