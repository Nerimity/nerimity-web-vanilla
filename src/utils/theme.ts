const DefaultTheme = {
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

  "markup-mention-background-color": "var(--gray-800)",
  "markup-mention-background-color-hover": "var(--gray-700)",
  "drawer-bg": "var(--gray-900)",
  "sidebar-bg": "var(--background)",

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

  "status-offline": "#adadad",
  "status-online": "#78e380",
  "status-looking-to-play": "#3b82f6",
  "status-away-from-keyboard": "#ff8f2c",
  "status-do-not-disturb": "#eb6e6e",

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
