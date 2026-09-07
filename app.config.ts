import { ExpoConfig } from "expo/config";
import APP from "./brand.json";
const config: ExpoConfig = {
  name: APP.name,
  slug: APP.slug,
  version: "1.0.0",
  orientation: "portrait",
  scheme: APP.slug,
  userInterfaceStyle: "automatic",
  plugins: [
    "expo-router",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Selecciona fotografías para una demostración local opcional.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  web: { bundler: "metro", output: "single" },
  experiments: { typedRoutes: true },
};
export default config;
