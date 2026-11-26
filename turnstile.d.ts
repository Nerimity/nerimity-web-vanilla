// Cloudflare Turnstile client-side API
// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

declare namespace Turnstile {
  type WidgetId = string;
  type Container = string | HTMLElement;

  interface RenderOptions {
    sitekey: string;
    action?: string;
    cData?: string;
    callback?: (token: string) => void;
    "error-callback"?: (errorCode: string) => boolean | void;
    "expired-callback"?: (token: string) => void;
    "before-interactive-callback"?: () => void;
    "after-interactive-callback"?: () => void;
    "unsupported-callback"?: () => void;
    "timeout-callback"?: () => void;
    execution?: "render" | "execute";
    theme?: "light" | "dark" | "auto";
    language?: string;
    tabindex?: number;
    "response-field"?: boolean;
    "response-field-name"?: string;
    size?: "normal" | "flexible" | "compact";
    retry?: "auto" | "never";
    "retry-interval"?: number;
    "refresh-expired"?: "auto" | "manual" | "never";
    "refresh-timeout"?: "auto" | "manual" | "never";
    appearance?: "always" | "execute" | "interaction-only";
    "feedback-enabled"?: boolean;
  }

  interface Turnstile {
    render(container: Container, options: RenderOptions): WidgetId | undefined;
    execute(container: Container, options?: Partial<RenderOptions>): void;
    reset(widgetId?: WidgetId | Container): void;
    remove(widgetId?: WidgetId | Container): void;
    getResponse(widgetId?: WidgetId | Container): string | undefined;
    isExpired(widgetId?: WidgetId | Container): boolean;
    ready(callback: () => void): void;
  }
}

interface Window {
  turnstile: Turnstile.Turnstile;
  onloadTurnstileCallback?: () => void;
}
