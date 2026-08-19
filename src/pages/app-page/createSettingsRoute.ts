import { createSettingsDrawer } from "../../components/settings/createSettingsDrawer";
import type { RouteContext } from "./AppPage";

const createSettingsRoute = ({ leftDrawer }: RouteContext) => {
  const abortController = new AbortController();
  // const { signal } = abortController;

  const serverChannelList = createSettingsDrawer();

  leftDrawer.replaceChildren(serverChannelList.render());

  const destroy = () => {
    abortController.abort();
    serverChannelList.destroy();
  };

  return { destroy };
};

export default createSettingsRoute;
