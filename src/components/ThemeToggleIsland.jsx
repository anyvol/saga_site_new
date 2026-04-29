import { useEffect, useState } from "react";

const STORAGE_KEY = "saga-theme";
const DARK_THEME_COLOR = "#0A1A1A";
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

function YodaIcon() {
  return (
    <svg
      className="theme-toggle-icon theme-toggle-icon-yoda"
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24 26 8 18c-2.6-1.3-5 1.7-3.4 4.1l9.1 13.3c1 1.5 2.8 2.2 4.5 1.7l6.8-2"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="m40 26 16-8c2.6-1.3 5 1.7 3.4 4.1l-9.1 13.3c-1 1.5-2.8 2.2-4.5 1.7l-6.8-2"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M19 32c0-10 5.6-17 13-17s13 7 13 17c0 9.7-5.3 17-13 17s-13-7.3-13-17Z"
        fill="currentColor"
      />
      <path
        d="M23 24c2.1-5 5.2-7.3 9-7.3s6.9 2.3 9 7.3c-2.8-1-5.8-1.5-9-1.5S25.8 23 23 24Z"
        fill="var(--bg)"
        opacity="0.22"
      />
      <path
        d="M20.8 34.8c2.3-1.6 4.7-2.1 7.4-1.5M43.2 34.8c-2.3-1.6-4.7-2.1-7.4-1.5"
        fill="none"
        stroke="var(--bg)"
        strokeLinecap="round"
        strokeWidth="3"
        opacity="0.48"
      />
      <path
        d="M28 42.5c2.6 1.2 5.4 1.2 8 0"
        fill="none"
        stroke="var(--bg)"
        strokeLinecap="round"
        strokeWidth="2.4"
        opacity="0.42"
      />
    </svg>
  );
}

function VaderIcon() {
  return (
    <svg
      className="theme-toggle-icon theme-toggle-icon-vader"
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18 30c0-10 5.5-18 14-18s14 8 14 18v13.5c0 5.2-4.2 8.5-14 8.5s-14-3.3-14-8.5V30Z"
        fill="currentColor"
      />
      <path
        d="M20 30c2.2-6.6 6.2-10.4 12-10.4S41.8 23.4 44 30"
        fill="none"
        stroke="var(--bg)"
        strokeLinecap="round"
        strokeWidth="2.8"
        opacity="0.26"
      />
      <path
        d="M23 31.5h9L28.4 38H23v-6.5ZM41 31.5h-9l3.6 6.5H41v-6.5Z"
        fill="var(--bg)"
        opacity="0.7"
      />
      <path
        d="M32 31.5v16"
        stroke="var(--bg)"
        strokeLinecap="round"
        strokeWidth="2.8"
        opacity="0.62"
      />
      <path
        d="M25 44h14M27 48h10"
        stroke="var(--bg)"
        strokeLinecap="round"
        strokeWidth="2.4"
        opacity="0.58"
      />
      <path
        d="m22 52-7 4 4-11M42 52l7 4-4-11"
        fill="currentColor"
        opacity="0.82"
      />
    </svg>
  );
}

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
    window.dispatchEvent(new CustomEvent("saga:theme-change", { detail: { theme: nextTheme } }));
    window.sagaTrack?.("theme_toggle", { theme: nextTheme });
    setTheme(nextTheme);
  };

  const label = theme === "dark" ? "Join the light side" : "Join the dark side";
  const Icon = theme === "dark" ? YodaIcon : VaderIcon;

  return (
    <button
      type="button"
      className="theme-toggle-button"
      aria-label={label}
      aria-pressed={theme === "light"}
      onClick={toggleTheme}
    >
      <Icon />
    </button>
  );
}
