import { updateTheme } from "./utils/theme";
updateTheme();
import "./i18n";
import "./style.css";
import type createAppPage from "./pages/app-page/AppPage";
import { createTokenSource } from "./utils/createTokenSource";
import { getLocalItem } from "./utils/localStorage";
import { portalElement } from "./utils/portal";
import { router, type MatchResult } from "./utils/router";
import { userAgent } from "./utils/userAgent";

(async () => {
  if (!globalThis.URLPattern) {
    console.log("polyfilling URLPattern");
    const { URLPattern } = await import("urlpattern-polyfill");
    globalThis.URLPattern = URLPattern as typeof globalThis.URLPattern;
  }
  if (!globalThis.Temporal) {
    console.log("polyfilling Temporal");
    const { install } = await import("temporal-polyfill/shim");
    install();
  }
  if (!globalThis.Intl.DurationFormat) {
    console.log("polyfilling Intl.DurationFormat");
    await import("@formatjs/intl-durationformat/polyfill-force.js");
  }

  const AppPage = () => import("./pages/app-page/AppPage");
  const LoginPage = () => import("./pages/LoginPage");
  const HomePage = () => import("./pages/HomePage");

  const App = () => {
    const ac = new AbortController();
    const { signal } = ac;
    const app = document.getElementById("app")!;
    if (userAgent.mobile) {
      app.classList.add("mobileAgent");
      portalElement().classList.add("mobileAgent");
    }
    let currentPage: ReturnType<typeof createAppPage> | undefined = undefined;

    let pageSource = createTokenSource();

    const navigate = async (create?: typeof AppPage) => {
      const isStale = pageSource.capture();
      currentPage?.destroy();
      app.replaceChildren();
      const newPage = create ? (await create()).default : undefined;
      if (isStale()) return;
      currentPage = newPage?.();
      currentPage?.render();
    };
    const handleEnter = (cb: () => void) => {
      return (res: MatchResult | null) => {
        if (res) {
          cb();
        }
      };
    };

    router.createMatchListener(
      "/app/*?",
      handleEnter(() => {
        // if (!getLocalItem("userToken")) {
        //   return router.navigate("/login", { replace: true });
        // }
        navigate(AppPage);
      }),
      { signal },
    );
    router.createMatchListener(
      "/login",
      handleEnter(() => {
        if (getLocalItem("userToken")) {
          return router.navigate("/app", { replace: true });
        }
        navigate(LoginPage);
      }),
      { signal },
    );
    router.createMatchListener(
      "/",
      handleEnter(() => navigate(HomePage)),
      { signal },
    );
  };

  App();
})();
