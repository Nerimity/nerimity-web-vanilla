import { captchaSitekey } from "../config";

let ready = () => document.querySelector("#ner-captcha");

const loadCaptchaScript = () => {
  if (ready()) return;
  const el = (
    <script
      id="ner-captcha"
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback"
      async
      defer
      data-theme="dark"
    ></script>
  );
  document.head.appendChild(el);
};

export const createCaptcha = (props: {
  signal: AbortSignal;
  onVerify: (token: string) => void;
  onError?: () => void;
  onTimeout?: () => void;
  retry?: "auto" | "never" | undefined;
}) => {
  const el = (<div id="turnstile-container"></div>) as HTMLDivElement;
  let widgetId: string | undefined = undefined;
  const onReady = () => {
    widgetId = window.turnstile.render(el, {
      theme: "dark",
      retry: props.retry,
      sitekey: captchaSitekey,
      "error-callback": () => props.onError?.(),
      "timeout-callback": () => props.onTimeout?.(),
      callback: function (token) {
        props.onVerify(token);
      },
    });
  };
  if (ready()) {
    onReady();
  }
  loadCaptchaScript();

  window.onloadTurnstileCallback = onReady;

  const reset = () => {
    if (widgetId) {
      window.turnstile.reset(widgetId);
    }
  };

  props.signal.addEventListener(
    "abort",
    () => {
      if (widgetId) {
        window.turnstile.remove(widgetId);
      }
    },
    { once: true },
  );

  return { element: el, reset };
};
