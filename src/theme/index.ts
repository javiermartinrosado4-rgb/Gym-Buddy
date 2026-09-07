import { createContext, createElement, ReactNode, useContext } from "react";
import { useStore } from "../state/Store";
import { useSystemTheme } from "./useSystemTheme";
import { palettes } from "./palettes";
const ThemeContext = createContext({ colors: palettes.light, dark: false });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const system = useSystemTheme();
  const mode = state.theme === "system" ? system : state.theme;
  return createElement(
    ThemeContext.Provider,
    { value: { colors: palettes[mode], dark: mode === "dark" } },
    children,
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
