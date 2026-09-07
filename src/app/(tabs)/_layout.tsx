import { Redirect, Slot, router, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useStore } from "../../state/Store";
import { useTheme } from "../../theme";
import { Icon, Txt } from "../../components/ui";
const tabs = [
  { path: "/today", name: "Hoy", icon: "sun" },
  { path: "/routine", name: "Rutina", icon: "grid" },
  { path: "/progress", name: "Progreso", icon: "bar-chart-2" },
  { path: "/community", name: "Comunidad", icon: "users" },
  { path: "/profile", name: "Perfil", icon: "user" },
] as const;
export default function TabsLayout() {
  const { state } = useStore();
  const path = usePathname();
  const { colors } = useTheme();
  const [focused, setFocused] = useState<string | null>(null);
  if (!state.completed || state.signedOut) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <View
        style={{
          flexDirection: "row",
          gap: 2,
          padding: 10,
          borderTopWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.path}
            accessibilityRole="button"
            accessibilityLabel={tab.name}
            accessibilityState={{ selected: path === tab.path }}
            aria-current={path === tab.path ? "page" : undefined}
            onFocus={() => setFocused(tab.path)}
            onBlur={() => setFocused(null)}
            onPress={() => router.replace(tab.path)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 56,
              gap: 5,
              padding: 8,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              borderWidth: 2,
              borderColor: focused === tab.path ? colors.accent : "transparent",
              backgroundColor:
                path === tab.path ? colors.accentSoft : "transparent",
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={path === tab.path ? colors.accent : colors.muted}
            />
            <Txt
              size={11}
              weight={path === tab.path ? "600" : "400"}
              muted={path !== tab.path}
            >
              {tab.name}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
