import { ExpoConfig } from "expo/config";
import APP from "./brand.json";
const localAndroid = process.env.GYM_ANDROID_LOCAL === "1";
const config: ExpoConfig = {
  name: APP.name,
  slug: APP.slug,
  version: "1.0.0",
  orientation: "portrait",
  scheme: APP.slug,
  userInterfaceStyle: "automatic",
  icon: "./assets/brand/icon.png",
  android: {
    package: "com.javiermartinrosado.gymbuddy",
    versionCode: 1,
    allowBackup: false,
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      foregroundImage: "./assets/brand/foreground.png",
      backgroundColor: "#F7F8F2",
      monochromeImage: "./assets/brand/monochrome.png",
    },
    blockedPermissions: ["android.permission.SYSTEM_ALERT_WINDOW", "android.permission.RECORD_AUDIO", "android.permission.CAMERA", "android.permission.READ_MEDIA_IMAGES", "android.permission.READ_MEDIA_VIDEO", "android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE"],
  },
  plugins: [
    "expo-router",
    "./plugins/withAndroidSigning",
    ["expo-splash-screen", { image: "./assets/brand/splash.png", imageWidth: 180, backgroundColor: "#F7F8F2", dark: { backgroundColor: "#121713" } }],
    ["expo-build-properties", { android: { usesCleartextTraffic: localAndroid } }],
    // Android autolinks Nitro Google Sign-In; its client ID comes from our API.
    // The package's config plugin is only needed for Firebase files / iOS.
    [
      "expo-image-picker",
      {
        photosPermission:
          "Selecciona fotografías para tu perfil, publicaciones o la demostración opcional.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  web: { bundler: "metro", output: "single" },
  experiments: { typedRoutes: true },
};
export default config;
