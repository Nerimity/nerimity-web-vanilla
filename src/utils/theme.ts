import { getLocalItem, setLocalItem } from "./localStorage";

export const DefaultTheme = {
  background: "black",
  "text-color": "#ffffff",
  "text-muted": "hsl(220, 6%, 50%)",
  "primary-color": "#3e88ff",
  "success-color": "#4bba5b",
  "primary-dark": "var(--primary-color-dark)",
  "alert-color": "#eb5c5c",
  "warn-color": "#f1750f",
  "item-bg": "rgba(255, 255, 255, 0.1)",

  "input-background-color": "black",

  "app-bg": "var(--background)",
  "explore-page-bg": "var(--background)",
  "drawer-content-bg": "var(--background)",
  "drawer-overlay-bg": "var(--background)",
  "modal-bg": "var(--background)",

  "markup-mention-background-color": "var(--gray-800)",
  "markup-mention-background-color-hover": "var(--gray-700)",
  "drawer-bg": "var(--background)",

  "text-emphasis-color": "var(--gray-100)",
  "text-secondary-color": "var(--gray-300)",
  "text-muted-color": "var(--gray-400)",
  "text-subtle-color": "var(--gray-500)",
  "badge-text-color": "var(--gray-800)",
  "avatar-letter-color": "var(--gray-800)",

  "surface-inset-bg": "var(--gray-1000)",
  "pane-bg": "var(--gray-900)",
  "surface-bg": "var(--pane-bg)",
  "surface-raised-bg": "var(--gray-850)",
  "surface-overlay-bg": "var(--gray-800)",
  "surface-interactive-bg": "var(--gray-700)",
  "surface-muted-bg": "var(--gray-600)",
  "side-pane-bg": "var(--gray-900)",
  "header-bg": "transparent",
  "header-bg-blur-disabled": "var(--surface-bg)",
  "tooltip-bg": "var(--surface-bg)",
  "chat-input-bg": "var(--input-background-color)",
  "chat-input-bg-blur-disabled": "var(--input-background-color)",
  "format-bar-bg": "var(--input-background-color)",
  "format-bar-bg-blur-disabled": "var(--input-background-color)",
  "message-hover-bg": "var(--surface-raised-bg)",
  "message-floating-options-bg": "var(--drawer-bg)",
  "primary-color-dark": "#0b1a33",
  "alert-color-dark": "#3e2626",
  "warn-color-dark": "#3a3229",
  "success-color-dark": "#1c221d",
  "status-looking-to-play": "#3b82f6",
  "status-away-from-keyboard": "#ff8f2c",
  "status-do-not-disturb": "#eb6e6e",
  "content-color": "var(--gray-200)",
  "text-content-color": "var(--content-color)",
  "sidebar-text-color": "var(--text-color)",
  "typing-indicator-color": "var(--text-color)",
  "typing-indicator-secondary-color": "var(--text-muted-color)",
  "markup-code-bg": "var(--surface-overlay-bg)",
  "markup-codeblock-bg": "var(--surface-bg)",
  "markup-spoiler-bg": "var(--surface-overlay-bg)",
  "markup-spoiler-bg-hover": "var(--surface-interactive-bg)",
  "drawer-item-bg": "var(--item-bg)",
  "drawer-item-hover-bg": "var(--surface-raised-bg)",
  "control-hover-bg": "var(--gray-300)",
  "item-hover-indicator-color": "var(--gray-500)",

  "border-inset-color": "var(--gray-900)",
  "border-color": "var(--gray-700)",
  "border-subtle-color": "var(--gray-600)",
  "control-border-color": "var(--gray-800)",
  "control-outline-color": "var(--gray-500)",
  "control-selected-outline-color": "var(--gray-400)",
  "control-strong-outline-color": "var(--gray-600)",

  "gray-50": "hsl(220, 0%, 95%)",
  "gray-100": "hsl(220, 0%, 90%)",
  "gray-200": "hsl(220, 0%, 80%)",
  "gray-300": "hsl(220, 0%, 70%)",
  "gray-400": "hsl(220, 0%, 50%)",
  "gray-500": "hsl(220, 0%, 40%)",
  "gray-600": "hsl(220, 0%, 30%)",
  "gray-700": "hsl(220, 0%, 20%)",
  "gray-800": "hsl(220, 0%, 10%)",
  "gray-850": "hsl(220, 0%, 7.5%)",
  "gray-900": "hsl(0, 0%, 5%)",
  "gray-1000": "hsl(0, 0%, 0%)",

  "radius-max": "9999px",
  "radius-2": "2px",
  "radius-3": "3px",
  "radius-4": "4px",
  "radius-5": "5px",
  "radius-6": "6px",
  "radius-8": "8px",
  "radius-10": "10px",
  "radius-12": "12px",
  "radius-14": "14px",
  "radius-16": "16px",
  "radius-18": "18px",

  "status-offline": "#adadad",
  "status-online": "#78e380",

  "font-mono": `"SF Mono", "Cascadia Code", "Consolas", "Roboto Mono", "Menlo", "Monaco", "Courier New", monospace`,
};

export type Theme = typeof DefaultTheme;

let currentTheme: Partial<Theme> = {
  ...getLocalItem("theme", DefaultTheme),
  ...DefaultTheme,
}!;

export const updateTheme = (theme?: Partial<Theme>) => {
  if (theme) {
    currentTheme = normalizeThemeColors(theme);

    const customColors = Object.fromEntries(
      Object.entries(currentTheme).filter(
        ([key, value]) => value !== DefaultTheme[key as keyof Theme],
      ),
    ) as Partial<Theme>;
    setLocalItem("theme", customColors);
  }

  for (const [key, value] of Object.entries(DefaultTheme)) {
    const customValue = currentTheme[key as keyof typeof currentTheme];
    document.documentElement.style.setProperty(
      `--${key}`,
      customValue || value,
    );
  }
};

updateTheme();

export function mapLegacyThemeKey(key: string) {
  const legacyMapping: Record<string, string> = {
    "background-color": "background",
    "pane-color": "pane-bg",
    "side-pane-color": "side-pane-bg",
    "header-background-color": "header-bg",
    "header-background-color-blur-disabled": "header-bg-blur-disabled",
    "tooltip-background-color": "tooltip-bg",
    "chat-input-background-color": "chat-input-bg",
    "chat-input-background-color-blur-disabled": "chat-input-bg-blur-disabled",
    "chat-markup-bar-background-color": "format-bar-bg",
    "chat-markup-bar-background-color-blur-disabled":
      "format-bar-bg-blur-disabled",
    "message-hover-background-color": "message-hover-bg",
    "message-floating-options-background-color": "message-floating-options-bg",
    "primary-color-dark": "primary-color-dark",
    "alert-color-dark": "alert-color-dark",
    "warn-color-dark": "warn-color-dark",
    "success-color-dark": "success-color-dark",
    "status-looking-to-play": "status-looking-to-play",
    "status-away-from-keyboard": "status-away-from-keyboard",
    "status-do-not-disturb": "status-do-not-disturb",
    "content-color": "content-color",
    "side-pane-text-color": "sidebar-text-color",
    "typing-indicator-color": "typing-indicator-color",
    "typing-indicator-secondary-color": "typing-indicator-secondary-color",
    "markup-code-background-color": "markup-code-bg",
    "markup-codeblock-background-color": "markup-codeblock-bg",
    "markup-spoiler-background-color": "markup-spoiler-bg",
    "markup-spoiler-background-color-hover": "markup-spoiler-bg-hover",
    "drawer-item-background-color": "drawer-item-bg",
    "drawer-item-hover-background-color": "drawer-item-hover-bg",
  };

  if (Object.hasOwn(legacyMapping, key)) {
    return legacyMapping[key];
  }

  return Object.hasOwn(DefaultTheme, key) ? key : undefined;
}

const warnedUnknownThemeKeys = new Set<string>();

export function normalizeThemeColors(
  colors: Record<string, string>,
): Record<string, string> {
  const mergedColors = {
    ...DefaultTheme,
    ...colors,
  } as Record<string, string>;

  Object.entries(mergedColors).forEach(([key, value]) => {
    if (Object.hasOwn(DefaultTheme, key)) {
      return;
    }

    const modernKey = mapLegacyThemeKey(key);
    if (modernKey) {
      mergedColors[modernKey] = value;
      delete mergedColors[key];
      return;
    }

    if (warnedUnknownThemeKeys.has(key)) {
      return;
    }
    warnedUnknownThemeKeys.add(key);
    console.warn(`Unknown theme color key: ${key}`);
  });

  return mergedColors;
}
