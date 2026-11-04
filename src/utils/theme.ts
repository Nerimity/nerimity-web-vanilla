export const DefaultTheme = {
  background: "black",
  "text-color": "#ffffff",
  "text-muted": "hsl(220, 6%, 50%)",
  "primary-color": "#3e88ff",
  "success-color": "#4bba5b",
  "primary-dark": "#0b1a33",
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
  "drawer-bg": "var(--gray-900)",
  "sidebar-bg": "var(--background)",

  "text-emphasis-color": "var(--gray-100)",
  "text-content-color": "var(--gray-200)",
  "text-secondary-color": "var(--gray-300)",
  "text-muted-color": "var(--gray-400)",
  "text-subtle-color": "var(--gray-500)",
  "badge-text-color": "var(--gray-800)",
  "avatar-letter-color": "var(--gray-800)",

  "surface-inset-bg": "var(--gray-1000)",
  "surface-bg": "var(--gray-900)",
  "surface-raised-bg": "var(--gray-850)",
  "surface-overlay-bg": "var(--gray-800)",
  "surface-interactive-bg": "var(--gray-700)",
  "surface-muted-bg": "var(--gray-600)",
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
  "status-looking_to_play": "#3b82f6",
  "status-away_from_keyboard": "#ff8f2c",
  "status-do_not_disturb": "#eb6e6e",

  "font-mono": `"SF Mono", "Cascadia Code", "Consolas", "Roboto Mono", "Menlo", "Monaco", "Courier New", monospace`,
};

type Theme = typeof DefaultTheme;

let currentTheme: Partial<Theme> = DefaultTheme;

export const updateTheme = () => {
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
  };

  const isModernKey = key in DefaultTheme;

  return legacyMapping[key] || (isModernKey ? key : undefined);
}
