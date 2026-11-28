import { getLocalItem, setLocalItem } from "./localStorage";

const ThemeType = {
  PX: 0,
  COLOR: 1,
  FONT: 2,
} as const;

type ThemeType = (typeof ThemeType)[keyof typeof ThemeType];

export const CategoryThemes = [
  {
    name: "background",
    value: "black",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "text-color",
    value: "#ffffff",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "text-muted",
    value: "hsl(220, 6%, 50%)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "primary-color",
    value: "#3e88ff",
    category: "Accent",
    type: ThemeType.COLOR,
  },
  {
    name: "success-color",
    value: "#4bba5b",
    category: "Success",
    type: ThemeType.COLOR,
  },
  {
    name: "primary-dark",
    value: "var(--primary-color-dark)",
    category: "Accent",
    type: ThemeType.COLOR,
  },
  {
    name: "alert-color",
    value: "#eb5c5c",
    category: "Alert",
    type: ThemeType.COLOR,
  },
  {
    name: "warn-color",
    value: "#f1750f",
    category: "Warn",
    type: ThemeType.COLOR,
  },
  {
    name: "item-bg",
    value: "rgba(255, 255, 255, 0.1)",
    category: "Drawer",
    type: ThemeType.COLOR,
  },
  {
    name: "input-background-color",
    value: "black",
    category: "Input",
    type: ThemeType.COLOR,
  },
  {
    name: "app-bg",
    value: "var(--background)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "explore-page-bg",
    value: "var(--background)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "drawer-content-bg",
    value: "var(--background)",
    category: "Drawer",
    type: ThemeType.COLOR,
  },
  {
    name: "drawer-overlay-bg",
    value: "var(--background)",
    category: "Drawer",
    type: ThemeType.COLOR,
  },
  {
    name: "modal-bg",
    value: "var(--background)",
    category: "Overlays",
    type: ThemeType.COLOR,
  },
  {
    name: "markup-mention-background-color",
    value: "var(--gray-800)",
    category: "Markup",
    type: ThemeType.COLOR,
  },
  {
    name: "markup-mention-background-color-hover",
    value: "var(--gray-700)",
    category: "Markup",
    type: ThemeType.COLOR,
  },
  {
    name: "drawer-bg",
    value: "var(--background)",
    category: "Drawer",
    type: ThemeType.COLOR,
  },
  {
    name: "text-emphasis-color",
    value: "var(--gray-100)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "text-secondary-color",
    value: "var(--gray-300)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "text-muted-color",
    value: "var(--gray-400)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "text-subtle-color",
    value: "var(--gray-500)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "badge-text-color",
    value: "var(--gray-800)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "avatar-letter-color",
    value: "var(--gray-800)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "surface-inset-bg",
    value: "var(--gray-1000)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "pane-bg",
    value: "var(--gray-900)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "surface-bg",
    value: "var(--pane-bg)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "surface-raised-bg",
    value: "var(--gray-850)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "surface-overlay-bg",
    value: "var(--gray-800)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "surface-interactive-bg",
    value: "var(--gray-700)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "surface-muted-bg",
    value: "var(--gray-600)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "side-pane-bg",
    value: "var(--gray-900)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "header-bg",
    value: "transparent",
    category: "Overlays",
    type: ThemeType.COLOR,
  },
  {
    name: "header-bg-blur-disabled",
    value: "var(--surface-bg)",
    category: "Overlays",
    type: ThemeType.COLOR,
  },
  {
    name: "tooltip-bg",
    value: "var(--surface-bg)",
    category: "Overlays",
    type: ThemeType.COLOR,
  },
  {
    name: "chat-input-bg",
    value: "var(--input-background-color)",
    category: "Input",
    type: ThemeType.COLOR,
  },
  {
    name: "chat-input-bg-blur-disabled",
    value: "var(--input-background-color)",
    category: "Input",
    type: ThemeType.COLOR,
  },
  {
    name: "format-bar-bg",
    value: "var(--input-background-color)",
    category: "MarkupBar",
    type: ThemeType.COLOR,
  },
  {
    name: "format-bar-bg-blur-disabled",
    value: "var(--input-background-color)",
    category: "MarkupBar",
    type: ThemeType.COLOR,
  },
  {
    name: "message-hover-bg",
    value: "var(--surface-raised-bg)",
    category: "Message",
    type: ThemeType.COLOR,
  },
  {
    name: "message-floating-options-bg",
    value: "var(--drawer-bg)",
    category: "Message",
    type: ThemeType.COLOR,
  },
  {
    name: "primary-color-dark",
    value: "#0b1a33",
    category: "Accent",
    type: ThemeType.COLOR,
  },
  {
    name: "alert-color-dark",
    value: "#3e2626",
    category: "Alert",
    type: ThemeType.COLOR,
  },
  {
    name: "warn-color-dark",
    value: "#3a3229",
    category: "Warn",
    type: ThemeType.COLOR,
  },
  {
    name: "success-color-dark",
    value: "#1c221d",
    category: "Success",
    type: ThemeType.COLOR,
  },
  {
    name: "status-looking-to-play",
    value: "#3b82f6",
    category: "Status",
    type: ThemeType.COLOR,
  },
  {
    name: "status-away-from-keyboard",
    value: "#ff8f2c",
    category: "Status",
    type: ThemeType.COLOR,
  },
  {
    name: "status-do-not-disturb",
    value: "#eb6e6e",
    category: "Status",
    type: ThemeType.COLOR,
  },
  {
    name: "content-color",
    value: "var(--gray-200)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "text-content-color",
    value: "var(--content-color)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "sidebar-text-color",
    value: "var(--text-color)",
    category: "Text",
    type: ThemeType.COLOR,
  },
  {
    name: "typing-indicator-color",
    value: "var(--text-color)",
    category: "Message",
    type: ThemeType.COLOR,
  },
  {
    name: "typing-indicator-secondary-color",
    value: "var(--text-muted-color)",
    category: "Message",
    type: ThemeType.COLOR,
  },
  {
    name: "markup-code-bg",
    value: "var(--surface-overlay-bg)",
    category: "Markup",
    type: ThemeType.COLOR,
  },
  {
    name: "markup-codeblock-bg",
    value: "var(--surface-bg)",
    category: "Markup",
    type: ThemeType.COLOR,
  },
  {
    name: "markup-spoiler-bg",
    value: "var(--surface-overlay-bg)",
    category: "Markup",
    type: ThemeType.COLOR,
  },
  {
    name: "markup-spoiler-bg-hover",
    value: "var(--surface-interactive-bg)",
    category: "Markup",
    type: ThemeType.COLOR,
  },
  {
    name: "drawer-item-bg",
    value: "var(--item-bg)",
    category: "Drawer",
    type: ThemeType.COLOR,
  },
  {
    name: "drawer-item-hover-bg",
    value: "var(--surface-raised-bg)",
    category: "Drawer",
    type: ThemeType.COLOR,
  },
  {
    name: "control-hover-bg",
    value: "var(--gray-300)",
    category: "Input",
    type: ThemeType.COLOR,
  },
  {
    name: "item-hover-indicator-color",
    value: "var(--gray-500)",
    category: "Drawer",
    type: ThemeType.COLOR,
  },
  {
    name: "border-inset-color",
    value: "var(--gray-900)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "border-color",
    value: "var(--gray-700)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "border-subtle-color",
    value: "var(--gray-600)",
    category: "Surface",
    type: ThemeType.COLOR,
  },
  {
    name: "control-border-color",
    value: "var(--gray-800)",
    category: "Input",
    type: ThemeType.COLOR,
  },
  {
    name: "control-outline-color",
    value: "var(--gray-500)",
    category: "Input",
    type: ThemeType.COLOR,
  },
  {
    name: "control-selected-outline-color",
    value: "var(--gray-400)",
    category: "Input",
    type: ThemeType.COLOR,
  },
  {
    name: "control-strong-outline-color",
    value: "var(--gray-400)",
    category: "Input",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-50",
    value: "hsl(220, 0%, 95%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-100",
    value: "hsl(220, 0%, 90%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-200",
    value: "hsl(220, 0%, 80%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-300",
    value: "hsl(220, 0%, 70%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-400",
    value: "hsl(220, 0%, 50%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-500",
    value: "hsl(220, 0%, 40%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-600",
    value: "hsl(220, 0%, 30%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-700",
    value: "hsl(220, 0%, 20%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-800",
    value: "hsl(220, 0%, 10%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-850",
    value: "hsl(220, 0%, 7.5%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-900",
    value: "hsl(0, 0%, 5%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "gray-1000",
    value: "hsl(0, 0%, 0%)",
    category: "Other",
    type: ThemeType.COLOR,
  },
  {
    name: "radius-max",
    value: "9999px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-2",
    value: "2px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-3",
    value: "3px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-4",
    value: "4px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-5",
    value: "5px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-6",
    value: "6px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-8",
    value: "8px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-10",
    value: "10px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-12",
    value: "12px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-14",
    value: "14px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-16",
    value: "16px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "radius-18",
    value: "18px",
    category: "Other",
    type: ThemeType.PX,
  },
  {
    name: "status-offline",
    value: "#adadad",
    category: "Status",
    type: ThemeType.COLOR,
  },
  {
    name: "status-online",
    value: "#78e380",
    category: "Status",
    type: ThemeType.COLOR,
  },
  {
    name: "font-mono",
    value:
      '"SF Mono", "Cascadia Code", "Consolas", "Roboto Mono", "Menlo", "Monaco", "Courier New", monospace',
    category: "Other",
    type: ThemeType.FONT,
  },
] as const;

/** Rendering order for grouped theme settings; keep in sync with `category`. */
export const ThemeCategories = [
  "Surface",
  "Overlays",
  "Input",
  "MarkupBar",
  "Message",
  "Accent",
  "Alert",
  "Warn",
  "Success",
  "Status",
  "Text",
  "Markup",
  "Drawer",
  "Other",
] as const;

type ThemeName = (typeof CategoryThemes)[number]["name"];

export const DefaultTheme = CategoryThemes.reduce(
  (acc, theme) => {
    acc[theme.name] = theme.value;
    return acc;
  },
  {} as Record<ThemeName, string>,
);

export type Theme = typeof DefaultTheme;

let currentTheme: Partial<Theme> = {
  ...DefaultTheme,
  ...getLocalItem("theme", DefaultTheme),
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
