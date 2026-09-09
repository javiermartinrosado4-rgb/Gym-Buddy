import { messages } from "../content/es";
import { Redirect, router } from "expo-router";
import { Image, View } from "react-native";
import { APP, copy } from "../config";
import { useStore } from "../state/Store";
import { useTheme } from "../theme";
import { Button, Heading, Icon, Page, Pill, Row, Txt } from "../components/ui";
import { GoogleSignIn } from "../components/GoogleSignIn";
export default function Welcome() {
  const { state, update } = useStore();
  const { colors } = useTheme();
  if (state.completed && !state.signedOut) return <Redirect href="/today" />;
  if (state.signedOut) return <Page>
    <Heading title={APP.name} subtitle="Has cerrado tu sesión local. Tus entrenamientos están guardados en este dispositivo." />
    <Button label="Continuar con mi perfil" onPress={() => { update(s => ({ ...s, signedOut: false })); router.replace("/today"); }} />
    <GoogleSignIn enter />
    <Txt muted size={12}>El perfil local se conserva en este dispositivo. Google permite acceder a tu cuenta de Comunidad.</Txt>
  </Page>;
  return (
    <Page>
      <Row style={{ justifyContent: "space-between" }}>
        <Row>
          <Image source={require("../../assets/brand/foreground.png")} style={{ width: 28, height: 28 }} accessibilityLabel="Akhyles" />
          <Txt size={21} weight="600" style={{ letterSpacing: -0.8 }}>
            {APP.name}
          </Txt>
        </Row>
        <Button
          compact
          variant="ghost"
          label={messages.Welcome.apariencia}
          icon="sun"
          onPress={() => router.push("/settings")}
        />
      </Row>
      <View
        style={{
          height: 228,
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 8,
        }}
      >
        <View
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 178,
              height: 178,
              borderRadius: 89,
              borderWidth: 16,
              borderColor: colors.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image source={require("../../assets/brand/foreground.png")} style={{ width: 120, height: 120 }} accessibilityLabel="Akhyles" />
            <Txt size={10} muted style={{ letterSpacing: 3 }}>
              {messages.Welcome.menosEsMas}
            </Txt>
          </View>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 8,
            right: 24,
            backgroundColor: colors.accent,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            transform: [{ rotate: "-5deg" }],
          }}
        >
          <Txt size={12} weight="600" style={{ color: colors.onAccent }}>
            {messages.Welcome.tuTiempoTuRitmo}
          </Txt>
        </View>
      </View>
      <Pill>{messages.Welcome.entrenaConIntencion}</Pill>
      <Heading
        title={messages.Welcome.masConstanciamenosComplicaciones}
        subtitle={messages.Welcome.unPlanQueEncajaContigoYDeja}
      />
      <View style={{ gap: 18, marginVertical: 6 }}>
        {[
          [
            "sliders",
            messages.Welcome.unaRutinaATuMedida,
            messages.Welcome.adaptadaATuNivelDisponibilidadYMusculo,
          ],
          [
            "layers",
            messages.Welcome.dosSeriesQueCuentan,
            messages.Welcome.seriesEfectivasConTecnicaYProgresion,
          ],
          [
            "clock",
            messages.Welcome.siemprePorDebajoDe60Min,
            messages.Welcome.sesionesDisenadasParaAprovecharTuTiempo,
          ],
        ].map(([icon, title, detail]) => (
          <Row key={title} style={{ alignItems: "flex-start" }}>
            <View
              style={{
                backgroundColor: colors.soft,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <Icon name={icon as "sliders"} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt weight="600">{title}</Txt>
              <Txt muted size={13}>
                {detail}
              </Txt>
            </View>
          </Row>
        ))}
      </View>
      <Button
        label={
          state.onboardingStep > 0
            ? messages.Welcome.continuarMiRutina
            : messages.Welcome.crearMiRutina
        }
        icon="arrow-right"
        onPress={() => router.push("/onboarding")}
      />
      <GoogleSignIn enter />
      <Txt size={12} muted style={{ textAlign: "center" }}>
        {messages.Welcome.unos2Minutos}
        {copy.local}
      </Txt>
    </Page>
  );
}
