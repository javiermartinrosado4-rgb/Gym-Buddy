import { messages } from "../content/es";
import * as ImagePicker from "expo-image-picker";
import { Button } from "./ui";
export function PhotoSelect({
  label,
  onSelect,
  onError,
}: {
  label: string;
  onSelect: (name: string) => void;
  onError: (message: string) => void;
}) {
  const select = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.5,
        base64: false,
        exif: false,
      });
      if (!result.canceled)
        onSelect(
          result.assets[0].fileName ?? messages.PhotoSelect.fotoSeleccionada,
        );
    } catch {
      onError(messages.PhotoSelect.noSeHaPodidoSeleccionarLaImagen);
    }
  };
  return (
    <Button variant="secondary" label={label} icon="image" onPress={select} />
  );
}
