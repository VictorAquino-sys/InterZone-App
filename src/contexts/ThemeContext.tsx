// src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const THEME_STORAGE_KEY = "interzone_theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const colorScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(colorScheme ?? "light");

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setTheme(saved);
      }
    });
  }, []);

  // Respond to system changes if theme is "system"
  useEffect(() => {
    if (theme === "system") {
      setResolvedTheme(colorScheme ?? "light");
    }
  }, [theme, colorScheme]);

  // Update resolved theme when theme changes
  useEffect(() => {
    if (theme === "system") {
      setResolvedTheme(colorScheme ?? "light");
    } else {
      setResolvedTheme(theme);
    }
  }, [theme, colorScheme]);

  // Save theme changes
  useEffect(() => {
    AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleSetTheme = (t: Theme) => setTheme(t);

  const toggleTheme = () => {
    // Only toggle between light and dark (ignore "system" for toggle button)
    setTheme(prev =>
      prev === "light" ? "dark" : "light"
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme: handleSetTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
