import React from "react";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { APP } from "../config";
import { StoreProvider, useStore } from "../state/Store";
import { CommunityProvider } from "../state/Community";
import { ThemeProvider, useTheme } from "../theme";
import { Button, Loading, Notice } from "../components/ui";
export { ErrorBoundary } from "../components/RouteError";
function Frame() {
  const { ready, storageError, retry } = useStore();
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width > 600;
  React.useEffect(() => {
    if (Platform.OS === "web") {
      document.title = `${APP.name} · Entrena con intención`;
      document.documentElement.lang = "es";
      document.body.style.backgroundColor = colors.outside;
    }
  }, [colors.outside]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.outside,
        alignItems: "center",
        paddingVertical: wide ? 24 : 0,
      }}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <SafeAreaView
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 480,
          maxHeight: wide ? 960 : undefined,
          backgroundColor: colors.background,
          borderRadius: wide ? 28 : 0,
          overflow: "hidden",
          borderWidth: wide ? 1 : 0,
          borderColor: colors.border,
          boxShadow: wide ? "0 8px 40px rgba(0,0,0,0.05)" : undefined,
        }}
      >
        {storageError ? (
          <View style={{ padding: 16, gap: 8 }}>
            <Notice error>{storageError}</Notice>
            <Button
              label="Reintentar"
              onPress={retry}
              compact
              variant="secondary"
            />
          </View>
        ) : null}
        {ready ? <Slot /> : <Loading />}
      </SafeAreaView>
    </View>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider>
          <CommunityProvider><Frame /></CommunityProvider>
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
