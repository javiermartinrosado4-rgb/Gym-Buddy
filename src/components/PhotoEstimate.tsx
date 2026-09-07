import { messages } from "../content/es";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Profile } from "../types";
import { Button, Choice, Field, Notice, Pill, Txt } from "./ui";
import { PhotoSelect } from "./PhotoSelect";
import { copy } from "../config";
import { number } from "../logic/validation";
export function PhotoEstimate({
  profile,
  change,
}: {
  profile: Profile;
  change: (patch: Partial<Profile>) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "result">(
    profile.photoConfirmed ? "result" : "idle",
  );
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const analyze = () => {
    setError("");
    setStatus("loading");
    timer.current = setTimeout(() => {
      setPhotos({});
      change({ bodyFat: "15,5", photoConfirmed: false });
      setStatus("result");
    }, 1500);
  };
  return (
    <View style={{ gap: 12 }}>
      <Pill>{messages.PhotoEstimate.demostracionSinAnalisisReal}</Pill>
      <Notice>{copy.photo}</Notice>
      {status === "idle" && (
        <>
          <Txt size={13} muted>
            {
              messages.PhotoEstimate
                .cuerpoRelajadoSinContraerEIluminacionUniforme
            }
          </Txt>
          <Choice
            multiple
            title={messages.PhotoEstimate.doyMiConsentimientoExplicito}
            description={
              messages.PhotoEstimate.autorizoLaSeleccionLocalDeFotografiasPara
            }
            selected={consent}
            onPress={() => {
              setConsent(!consent);
              setPhotos({});
            }}
          />
          {consent && (
            <>
              {[
                messages.PhotoEstimate.frontal,
                messages.PhotoEstimate.lateral,
                messages.PhotoEstimate.traseraOpcional,
              ].map((label) => (
                <View key={label} style={{ gap: 4 }}>
                  <PhotoSelect
                    label={`Seleccionar foto ${label.toLowerCase()}`}
                    onSelect={(name) => {
                      setError("");
                      setPhotos((p) => ({ ...p, [label]: name }));
                    }}
                    onError={setError}
                  />
                  {photos[label] && (
                    <Txt size={12} muted>
                      ✓ {photos[label]}
                    </Txt>
                  )}
                </View>
              ))}
              <Button
                label={messages.PhotoEstimate.simularCargaYAnalisis}
                onPress={analyze}
                disabled={!photos.Frontal || !photos.Lateral}
              />
            </>
          )}
        </>
      )}
      {status === "loading" && (
        <>
          <ActivityIndicator />
          <Txt>{messages.PhotoEstimate.simulandoCargaLocalYAnalisis}</Txt>
        </>
      )}
      {status === "result" && (
        <>
          <Txt size={24} weight="600">
            14–17 %
          </Txt>
          <Txt muted>
            {messages.PhotoEstimate.rangoFicticioConfianzaMediaSimulada}
          </Txt>
          <Field
            label={messages.PhotoEstimate.valorCentralEditable}
            value={profile.bodyFat}
            numeric
            suffix={messages.PhotoEstimate.texto}
            onChangeText={(bodyFat) =>
              change({ bodyFat, photoConfirmed: false })
            }
          />
          <Txt size={12} muted>
            {messages.PhotoEstimate.lasReferenciasALasFotosYaSe}
          </Txt>
          <Button
            label={
              profile.photoConfirmed
                ? messages.PhotoEstimate.resultadoConfirmado
                : messages.PhotoEstimate.confirmarResultado
            }
            disabled={
              profile.photoConfirmed ||
              !Number.isFinite(number(profile.bodyFat)) ||
              number(profile.bodyFat) < 3 ||
              number(profile.bodyFat) > 65
            }
            onPress={() => change({ photoConfirmed: true })}
          />
          <Button
            variant="ghost"
            label={messages.PhotoEstimate.repetirSimulacion}
            onPress={() => {
              setStatus("idle");
              setConsent(false);
              change({ photoConfirmed: false });
            }}
          />
        </>
      )}
      {!!error && <Notice error>{error}</Notice>}
    </View>
  );
}
