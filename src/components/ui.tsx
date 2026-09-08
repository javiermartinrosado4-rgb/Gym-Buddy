import { messages } from "../content/es";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useTheme } from "../theme";
import { space } from "../config";
export function Txt({
  children,
  size = 15,
  muted = false,
  weight = "400",
  style,
  ...props
}: {
  children?: React.ReactNode;
  size?: number;
  muted?: boolean;
  weight?: TextStyle["fontWeight"];
  style?: TextStyle;
} & Pick<
  React.ComponentProps<typeof Text>,
  "accessibilityRole" | "accessibilityLiveRegion" | "testID" | "numberOfLines" | "ellipsizeMode"
>) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        {
          color: muted ? colors.muted : colors.text,
          fontSize: size,
          lineHeight: size * 1.45,
          fontWeight: weight,
          fontFamily: "System",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Icon({
  name,
  size = 20,
  color,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.accent} />;
}
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  icon,
  compact,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  compact?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  const fg = variant === "primary" ? colors.onAccent : colors.accent;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={({ pressed }) => ({
        minHeight: compact ? 42 : 54,
        paddingHorizontal: compact ? 12 : 20,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        backgroundColor:
          variant === "primary"
            ? colors.accent
            : variant === "secondary"
              ? colors.accentSoft
              : "transparent",
        opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
        borderWidth: 2,
        borderColor: focus ? colors.text : "transparent",
      })}
    >
      {icon && <Icon name={icon} size={18} color={fg} />}
      <Txt weight="600" size={compact ? 13 : 15} style={{ color: fg }}>
        {label}
      </Txt>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 18,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Choice({
  title,
  description,
  selected,
  onPress,
  disabled,
  icon,
  trailing,
  multiple = false,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  trailing?: React.ReactNode;
  multiple?: boolean;
}) {
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityLabel={title}
      aria-checked={selected}
      aria-disabled={!!disabled}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      disabled={disabled}
      {...(Platform.OS === "web"
        ? {
            onKeyDown: (event: {
              key: string;
              repeat: boolean;
              preventDefault: () => void;
            }) => {
              if (event.key === " " && !disabled) {
                event.preventDefault();
                if (!event.repeat) onPress();
              }
            },
          }
        : {})}
      onPress={onPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={({ pressed }) => ({
        padding: 17,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: focus
          ? colors.text
          : selected
            ? colors.accent
            : colors.border,
        backgroundColor: selected ? colors.accentSoft : colors.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      {icon && <Icon name={icon} />}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt weight="600">{title}</Txt>
        {description && (
          <Txt size={13} muted>
            {description}
          </Txt>
        )}
      </View>
      {trailing}
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: selected ? colors.accent : colors.muted,
          backgroundColor: selected ? colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && <Icon name="check" size={13} color={colors.onAccent} />}
      </View>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  error,
  suffix,
  numeric = false,
  placeholder,
  secure = false,
  maxLength,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  error?: string;
  suffix?: string;
  numeric?: boolean;
  placeholder?: string;
  secure?: boolean;
  maxLength?: number;
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 7, flex: 1 }}>
      <Txt size={13} weight="600">
        {label}
      </Txt>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1.5,
          borderColor: error
            ? colors.error
            : focus
              ? colors.accent
              : colors.muted,
          backgroundColor: colors.surface,
          borderRadius: 12,
          paddingRight: 14,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          inputMode={numeric ? "decimal" : "text"}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          maxLength={maxLength ?? (numeric ? 8 : 80)}
          secureTextEntry={secure}
          multiline={multiline}
          autoCapitalize={secure ? "none" : "sentences"}
          autoCorrect={!secure}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: multiline ? 96 : 50,
            padding: 14,
            color: colors.text,
            fontSize: 16,
            textAlignVertical: multiline ? "top" : "center",
          }}
        />
        {suffix && (
          <Txt size={13} muted>
            {suffix}
          </Txt>
        )}
      </View>
      {!!error && (
        <Txt
          accessibilityLiveRegion="polite"
          size={12}
          style={{ color: colors.error }}
        >
          {error}
        </Txt>
      )}
    </View>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: error ? colors.errorSoft : colors.accentSoft,
        padding: 15,
        borderRadius: 12,
        flexDirection: "row",
        gap: 10,
      }}
    >
      <Icon
        name={error ? "alert-circle" : "info"}
        size={17}
        color={error ? colors.error : colors.accent}
      />
      <Txt
        size={13}
        style={{ flex: 1, color: error ? colors.error : colors.text }}
      >
        {children}
      </Txt>
    </View>
  );
}
export function Pill({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: colors.accentSoft,
      }}
    >
      <Txt
        size={11}
        weight="600"
        style={{ color: colors.accent, letterSpacing: 0.5 }}
      >
        {children}
      </Txt>
    </View>
  );
}
export function Page({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: 36, gap: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      {eyebrow && (
        <Txt size={11} weight="600" muted style={{ letterSpacing: 2 }}>
          {eyebrow.toUpperCase()}
        </Txt>
      )}
      <Txt
        size={30}
        weight="600"
        accessibilityRole="header"
        style={{ letterSpacing: -1 }}
      >
        {title}
      </Txt>
      {subtitle && <Txt muted>{subtitle}</Txt>}
    </View>
  );
}
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[{ flexDirection: "row", gap: 12, alignItems: "center" }, style]}
    >
      {children}
    </View>
  );
}
export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
      <Txt muted>{messages.ui.preparandoTuEspacio}</Txt>
    </View>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
});
