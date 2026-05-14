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

  router.match(["/app/*", "/app/", "/app", "/login"], async (_, pathname) => {
    cancelCurrent?.();
    currentPage?.destroy();
    currentPage = null;

    let cancelled = false;
    cancelCurrent = () => {
      cancelled = true;
    };
    if (pathname.startsWith("/app")) {
      if (!getLocalItem("userToken")) {
        cancelled = true;
        cancelCurrent = null;
        router.navigate("/login", { replace: true });
        return;
      }
      const { createAppPage } = await AppPage();
      if (cancelled) {
        return;
      }
      currentPage = createAppPage();
      currentPage.render();
      return;
    }
    if (pathname === "/login") {
      if (getLocalItem("userToken")) {
        cancelled = true;
        cancelCurrent = null;
        router.navigate("/app/", { replace: true });
        return;
      }
      const { createLoginPage } = await LoginPage();
      if (cancelled) return;
      currentPage = createLoginPage();
      currentPage.render();
      return;
    }

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
};

App();
