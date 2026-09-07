import { useColorScheme } from "react-native";
export function useSystemTheme() {
  return useColorScheme() === "dark" ? "dark" : "light";
}
