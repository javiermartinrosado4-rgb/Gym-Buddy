import * as ImagePicker from "expo-image-picker";
import { Button } from "./ui";

export function CommunityPhoto({ onSelect, onError, label = "Seleccionar foto para publicar" }: { onSelect: (data: string) => void; onError: (message: string) => void; label?: string }) {
  const select = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, exif: false, quality: 0.7 });
      if (result.canceled) return;
      const photo = result.assets[0].base64;
      if (!photo || photo.length > 6_666_668) { onError("Elige una fotografía de hasta 5 MB."); return; }
      onSelect(`data:image/jpeg;base64,${photo}`);
    } catch { onError("No se ha podido seleccionar la fotografía."); }
  };
  return <Button label={label} icon="image" variant="secondary" onPress={select} />;
}
