import { Linking, StyleSheet, Text, type TextProps } from "react-native";

import { Colors, Fonts } from "@/theme/brand";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/** Plain text with http(s) URLs linkified on display. */
export function LinkedText({ children, style, ...rest }: TextProps) {
  const text = String(children ?? "");
  const parts = text.split(URL_REGEX);

  return (
    <Text style={[styles.text, style]} {...rest}>
      {parts.map((part, i) => {
        if (part.match(/^https?:\/\//)) {
          return (
            <Text
              key={`${i}-${part.slice(0, 12)}`}
              style={styles.link}
              onPress={() => void Linking.openURL(part)}
            >
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 21,
  },
  link: {
    color: Colors.teal,
    textDecorationLine: "underline",
  },
});
