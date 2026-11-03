import { Colors, Radius, Spacing } from "@/theme/brand";
import { StyleSheet, View, type ViewProps } from "react-native";

export function Screen({ style, ...props }: ViewProps) {
  return <View style={[styles.screen, style]} {...props} />;
}

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    marginBottom: Spacing.md,
  },
});
