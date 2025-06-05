// components/ThemedStatusBar.tsx
import React from "react";
import { StatusBar, Platform } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemedStatusBar() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <StatusBar
      translucent
      backgroundColor="transparent"
      barStyle={isDark ? "light-content" : "dark-content"}
    />
  );
}