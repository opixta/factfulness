import { Colors, Fonts, Radius, Spacing } from "@/theme/brand";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size * 0.28 },
      ]}
    />
  );
}

export function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  style?: object;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.primaryText, disabled && styles.disabledText]}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.ghost,
        disabled && styles.disabledGhost,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.ghostText, disabled && styles.disabledText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: Colors.teal,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(13, 107, 99, 0.1)",
  },
  pillText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.tealDeep,
  },
  primary: {
    backgroundColor: Colors.teal,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    alignItems: "center",
  },
  primaryText: {
    color: Colors.white,
    fontFamily: Fonts.uiSemiBold,
    fontSize: 15,
  },
  ghost: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  ghostText: {
    fontFamily: Fonts.uiSemiBold,
    color: Colors.tealDeep,
    fontSize: 15,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  disabledGhost: { opacity: 0.45, backgroundColor: Colors.paper },
  disabledText: { opacity: 0.7 },
});
