import "./i18n";
import "./style.css";
import type createAppPage from "./pages/AppPage";
import { getLocalItem } from "./utils/localStorage";
import { router, type MatchResult } from "./utils/router";
import { userAgent } from "./utils/userAgent";

const AppPage = () => import("./pages/AppPage");
const LoginPage = () => import("./pages/LoginPage");
const HomePage = () => import("./pages/HomePage");

const App = () => {
  const ac = new AbortController();
  const { signal } = ac;
  const app = document.getElementById("app")!;
  if (userAgent.mobile) {
    app.classList.add("mobileAgent");
  }
  let currentPage: ReturnType<typeof createAppPage> | undefined = undefined;

  let generation = 0;

  const navigate = async (create?: typeof AppPage) => {
    const gen = ++generation;
    currentPage?.destroy();
    app.replaceChildren();
    currentPage = create ? (await create()).default() : undefined;
    if (gen !== generation) return;
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
      if (!getLocalItem("userToken")) {
        return router.navigate("/login", { replace: true });
      }
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
