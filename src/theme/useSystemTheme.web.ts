import { useSyncExternalStore } from "react";
const subscribe = (listener: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const snapshot = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
export function useSystemTheme() {
  return useSyncExternalStore(subscribe, snapshot, () => "light");
}
