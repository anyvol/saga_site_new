import { useEffect, useState } from "react";

const STORAGE_KEY = "saga-theme";
const DARK_THEME_COLOR = "#0b0f0d";
const LIGHT_THEME_COLOR = "#f3f4f6";

const getCurrentTheme = () => {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR);
};

export default function ThemeToggleIsland() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const toggleTheme = () => {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      /* Theme still changes for this session if storage is unavailable. */
    }
    window.sagaTrack?.("theme_toggle", { theme: nextTheme });
    setTheme(nextTheme);
  };

  const label = theme === "dark" ? "Join the light side" : "Join the dark side";

  return (
    <button
      type="button"
      className="theme-toggle-button"
      aria-label={label}
      aria-pressed={theme === "light"}
      onClick={toggleTheme}
    >
      {label}
    </button>
  );
}
