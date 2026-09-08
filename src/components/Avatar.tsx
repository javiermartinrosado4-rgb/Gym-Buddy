import { Image, Pressable, View } from "react-native";
import { useState } from "react";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { avatars, validAvatarPhoto } from "../data/avatars";
import { useTheme } from "../theme";
import { Notice, Txt } from "./ui";
import { CommunityPhoto } from "./CommunityPhoto";

export function Avatar({ id, size = 68 }: { id?: string; size?: number }) {
  if (validAvatarPhoto(id)) return <Image source={{ uri: id }} accessibilityLabel="Foto de perfil" style={{ width: size, height: size, borderRadius: size / 2 }} />;
  const avatar = avatars.find(a => a.id === id) ?? avatars[0];
  return <Svg width={size} height={size} viewBox="0 0 80 80" accessibilityRole="image" accessibilityLabel={`Avatar ${avatar.name}`}>
    <Circle cx={40} cy={40} r={40} fill={avatar.color} />
    <Circle cx={40} cy={40} r={31} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} />
    <SvgText x={40} y={53} fontSize={39} fill="#FFFFFF" textAnchor="middle">{avatar.symbol}</SvgText>
  </Svg>;
}
export function AvatarSelect({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const { colors } = useTheme();
  const [error, setError] = useState("");
  return <View style={{ gap: 12 }}>
    <Txt weight="600">Imagen de perfil</Txt>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {avatars.map(a => <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Elegir avatar ${a.name}`} accessibilityState={{ selected: (value ?? avatars[0].id) === a.id }} onPress={() => onChange(a.id)} style={{ padding: 5, borderWidth: 2, borderRadius: 40, borderColor: (value ?? avatars[0].id) === a.id ? colors.accent : "transparent" }}>
        <Avatar id={a.id} size={52} />
      </Pressable>)}
    </View>
    <CommunityPhoto label="Seleccionar foto de perfil" onError={setError} onSelect={photo => {
      if (!validAvatarPhoto(photo)) { setError("Para el perfil, elige una foto de menos de 500 KB."); return; }
      setError(""); onChange(photo);
    }} />
    {validAvatarPhoto(value) && <Avatar id={value} />}
    {!!error && <Notice error>{error}</Notice>}
  </View>;
}
