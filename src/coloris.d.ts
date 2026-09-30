declare module "@melloware/coloris" {
  export interface ColorisOptions {
    el?: HTMLInputElement;
    parent?: HTMLElement;
    themeMode?: "dark" | "light";
    inline?: boolean;
    alpha?: boolean;
    defaultColor?: string;
    onChange?: (color: string) => void;
  }

  export interface ColorisInstance {
    (options: ColorisOptions): void;
    init(): void;
    setColor(color: string, input?: HTMLInputElement | null): void;
    close(): void;
    updatePosition(): void;
  }

  const Coloris: ColorisInstance;
  export default Coloris;
}
