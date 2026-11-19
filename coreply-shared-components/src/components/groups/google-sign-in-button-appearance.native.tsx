import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useUniwind } from "uniwind";
import { googleLogoPaths, type GoogleSignInButtonDesignProps } from "./google-sign-in-button-design";

export function GoogleSignInButtonAppearance({ disabled, loading, label, onPress }: GoogleSignInButtonDesignProps) {
  const { theme } = useUniwind();
  const dark = theme === "dark";
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      hitSlop={{ top: 4, bottom: 4 }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: dark ? "#131314" : "#ffffff",
          borderColor: dark ? "#8e918f" : "#747775",
        },
        !disabled && (pressed || focused) && {
          // Google's 12% state overlay composited onto the button background.
          backgroundColor: dark ? "#2f2f30" : "#e6e6e6",
        },
        disabled && {
          backgroundColor: dark ? "#13131461" : "#ffffff61",
          borderColor: dark ? "#8e918f1f" : "#1f1f1f1f",
        },
      ]}
    >
      <View pointerEvents="none" style={[styles.content, disabled && styles.disabledContent]}>
        <Svg width={20} height={20} viewBox="0 0 48 48" accessible={false}>
          {googleLogoPaths.map((path) => <Path key={path.fill} {...path} />)}
        </Svg>
        <Text numberOfLines={1} style={[styles.label, { color: dark ? "#e3e3e3" : "#1f1f1f" }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    maxWidth: 400,
    height: 40,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 4,
    overflow: "hidden",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontFamily: Platform.OS === "android" ? "sans-serif-medium" : "System",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.25,
    flexShrink: 1,
  },
  disabledContent: { opacity: 0.38 },
});
