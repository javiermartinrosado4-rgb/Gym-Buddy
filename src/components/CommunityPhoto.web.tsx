import { useRef } from "react";
import { View } from "react-native";
import { Button } from "./ui";

export function CommunityPhoto({ onSelect, onError, label = "Seleccionar foto para publicar" }: { onSelect: (data: string) => void; onError: (message: string) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return <View>
    <input ref={input} type="file" aria-label={label} accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
      onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5_000_000) { onError("Elige una foto JPEG, PNG o WebP de hasta 5 MB."); return; }
        const reader = new FileReader();
        reader.onload = () => onSelect(String(reader.result));
        reader.onerror = () => onError("No se ha podido leer la fotografía.");
        reader.readAsDataURL(file);
      }} />
    <Button label={label} icon="image" variant="secondary" onPress={() => input.current?.click()} />
  </View>;
}
