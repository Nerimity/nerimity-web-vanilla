import { t } from "@lingui/core/macro";

import { createSettingsDrawer } from "../../components/settings/createSettingsDrawer";
import { router } from "../../utils/router";
import { getAppHeader, type RouteContext } from "./AppPage";

type Page = { destroy: () => void };

export interface Setting {
  id: string;
  icon: string;
  name: () => string;
  path: string;
  load: () => Promise<{ default: (context: any) => Page }>;
}

export const Settings: Setting[] = [
  {
    id: "account",
    icon: "account_circle",
    name: () => t`Account`,
    path: "/account",
    load: () => import("../../pages/app-page/createHomePane"),
  },
  {
    id: "profile",
    icon: "person",
    name: () => t`Profile`,
    path: "/profile",
    load: () => import("../../pages/app-page/createHomePane"),
  },
];

const createSettingsRoute = ({ leftDrawer }: RouteContext) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const serverChannelList = createSettingsDrawer();

  leftDrawer.replaceChildren(serverChannelList.render());

  router.createMatchListener(
    "/app/settings/*",
    () => {
      const matchedRoute = Settings.find((s) =>
        router.match("/app/settings" + s.path),
      );
      if (!matchedRoute) return;
      getAppHeader()?.updateHeader({
        icon: matchedRoute.icon,
        label: matchedRoute.name(),
      });
    },
    { signal, always: true },
  );

  const destroy = () => {
    getAppHeader()?.updateHeader({ trigger: false });

    abortController.abort();
    serverChannelList.destroy();
  };

  return { destroy };
};

export default createSettingsRoute;
