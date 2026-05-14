import "./i18n";
import { Link } from "./components/link";

import "./style.css";
import { h } from "./h";
import type { createAppPage } from "./pages/AppPage";
import { getLocalItem } from "./utils/localStorage";
import { router } from "./utils/router";

const AppPage = () => import("./pages/AppPage");
const LoginPage = () => import("./pages/LoginPage");

const App = () => {
  const app = document.getElementById("app")!;
  let currentPage: ReturnType<typeof createAppPage> | null = null;
  let cancelCurrent: (() => void) | null = null;
  let currentRoute: "app" | "login" | null = null;

  const navigateTo = (path: any) => {
    currentRoute = null;
    cancelCurrent = null;
    router.navigate(path, { replace: true });
  };

  router.match(["/"], () => {
    currentPage?.destroy();
    currentPage = null;
    currentRoute = null;
    app.replaceChildren(
      <div>
        <Link decoration href="/app">
          App
        </Link>
        <br />
        <Link decoration href="/login">
          Login
        </Link>
      </div>,
    );
  });

  router.match(
    ["/", "/app/*", "/app/", "/app", "/login"],
    async (_, pathname) => {
      if (pathname === "/") {
        currentPage?.destroy();
        currentPage = null;
        currentRoute = null;
        app.replaceChildren(
          <div>
            <Link decoration href="/app">
              App
            </Link>
            <br />
            <Link decoration href="/login">
              Login
            </Link>
          </div>,
        );
        return;
      }

      const nextRoute = pathname.startsWith("/app") ? "app" : "login";
      if (nextRoute === currentRoute) return;
      currentRoute = nextRoute;

      cancelCurrent?.();
      currentPage?.destroy();
      currentPage = null;

      let cancelled = false;
      cancelCurrent = () => {
        cancelled = true;
      };

      if (pathname.startsWith("/app")) {
        if (!getLocalItem("userToken")) return navigateTo("/login");
        const { createAppPage } = await AppPage();
        if (cancelled) return;
        currentPage = createAppPage();
        currentPage.render();
        return;
      }

      if (pathname === "/login") {
        if (getLocalItem("userToken")) return navigateTo("/app/");
        const { createLoginPage } = await LoginPage();
        if (cancelled) return;
        currentPage = createLoginPage();
        currentPage.render();
      }
    },
  );
};

App();
