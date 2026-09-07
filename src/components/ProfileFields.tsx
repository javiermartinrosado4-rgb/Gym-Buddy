import { messages } from "../content/es";
import { View } from "react-native";
import { Profile } from "../types";
import { Choice, Field, Notice, Row, Txt } from "./ui";
import { PhotoEstimate } from "./PhotoEstimate";
import { number } from "../logic/validation";
export function ProfileFields({
  profile,
  change,
  errors = {},
}: {
  profile: Profile;
  change: (patch: Partial<Profile>) => void;
  errors?: Record<string, string>;
}) {
  const adult =
    Number.isInteger(number(profile.age)) &&
    number(profile.age) > 18 &&
    number(profile.age) <= 100;
  return (
    <View style={{ gap: 18 }}>
      <Field label="Nombre" value={profile.name ?? ""} onChangeText={name => change({ name })} error={errors.name} />
      <Field label="Nombre de usuario (@)" value={profile.handle ?? ""} onChangeText={handle => change({ handle: handle.replace(/^@/, "") })} error={errors.handle} />
      <Txt muted size={12}>Tu @ se guarda localmente. La reserva y búsqueda de nombres llegará con Comunidad.</Txt>
      <Txt weight="600" size={13}>
        {messages.ProfileFields.sexoBiologico}
      </Txt>
      <Row>
        <View style={{ flex: 1 }}>
          <Choice
            title={messages.ProfileFields.hombre}
            selected={profile.sex === "male"}
            onPress={() => change({ sex: "male" })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Choice
            title={messages.ProfileFields.mujer}
            selected={profile.sex === "female"}
            onPress={() => change({ sex: "female" })}
          />
        </View>
      </Row>
      {errors.sex && <Notice error>{errors.sex}</Notice>}
      <Row style={{ alignItems: "flex-start" }}>
        <Field
          label={messages.ProfileFields.edad}
          value={profile.age}
          numeric
          suffix={messages.ProfileFields.anos}
          error={errors.age}
          onChangeText={(age) =>
            change({
              age,
              ...(number(age) <= 18 || !Number.isInteger(number(age))
                ? {
                    fatMode:
                      profile.fatMode === "photo" ? "unknown" : profile.fatMode,
                    photoConfirmed: false,
                  }
                : {}),
            })
          }
        />
        <Field
          label={messages.ProfileFields.altura}
          value={profile.height}
          numeric
          suffix={messages.ProfileFields.cm}
          error={errors.height}
          onChangeText={(height) => change({ height })}
        />
      </Row>
      <Field
        label={messages.ProfileFields.pesoCorporal}
        value={profile.weight}
        numeric
        suffix={messages.ProfileFields.kg}
        placeholder={messages.ProfileFields.porEjemplo765}
        error={errors.weight}
        onChangeText={(weight) => change({ weight })}
      />
      <Txt weight="600">{messages.ProfileFields.porcentajeGraso}</Txt>
      <Choice
        title={messages.ProfileFields.noLoSe}
        description={messages.ProfileFields.puedesCrearTuRutinaSinEsteDato}
        selected={profile.fatMode === "unknown"}
        onPress={() => change({ fatMode: "unknown", photoConfirmed: false })}
      />
      <Choice
        title={messages.ProfileFields.introducirloManualmente}
        selected={profile.fatMode === "manual"}
        onPress={() => change({ fatMode: "manual", photoConfirmed: false })}
      />
      <Choice
        title={messages.ProfileFields.estimarloMedianteFotografias}
        description={
          adult
            ? messages.ProfileFields.simulacionOpcionalYPrivada
            : messages.ProfileFields.disponibleUnicamenteParaMayoresDe18Anos
        }
        selected={profile.fatMode === "photo"}
        disabled={!adult}
        onPress={() => change({ fatMode: "photo", photoConfirmed: false })}
      />
      {profile.fatMode === "manual" && (
        <Field
          label={messages.ProfileFields.porcentajeGraso}
          value={profile.bodyFat}
          numeric
          suffix={messages.ProfileFields.texto}
          error={errors.bodyFat}
          onChangeText={(bodyFat) => change({ bodyFat })}
        />
      )}
      {profile.fatMode === "photo" && adult && (
        <PhotoEstimate profile={profile} change={change} />
      )}
      {errors.photo && <Notice error>{errors.photo}</Notice>}
    </View>
  );
}
