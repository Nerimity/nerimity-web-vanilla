import { Plural, Trans } from "@trans";
import morphdom from "morphdom";

import { Avatar } from "../../../components/avatar";
import { Banner, bannerCroppedHandler } from "../../../components/Banner";
import { createServerSettingsDrawer } from "../../../components/server-settings/createServerSettingsDrawer";
import { isMobileWidth } from "../../../config";
import { accountStore } from "../../../store/accountStore";
import { serverMemberStore } from "../../../store/serverMemberStore";
import { serverStore } from "../../../store/serverStore";
import { storeEmitter } from "../../../utils/EventEmitter";
import { router } from "../../../utils/router";
import { getAppHeader, type RouteContext } from "../AppPage";
import {
  ServerSettings,
  type Page,
  type ServerHeaderOverrides,
  type ServerSettingsContext,
} from "./ServerSettings";

import style from "./createServerSettingsRoute.module.css";

const Stats = () => {
  const serverId = router.match<{ serverId: string }>(
    "/app/servers/:serverId/*",
  )?.params.serverId;

  if (!serverId) return null;

  const memberSize = serverMemberStore.serverMembers.get(serverId)?.size || 0;

  return (
    <div class={style.stats}>
      <span class={style.stat}>
        <Plural
          value={memberSize}
          _0={
            <Trans>
              <span class={style.full}>No</span> Members
            </Trans>
          }
          one={
            <Trans>
              <span class={style.full}>#</span> Member
            </Trans>
          }
          other={
            <Trans>
              <span class={style.full}>#</span> Members
            </Trans>
          }
        />
      </span>
    </div>
  );
};

let headerAc: AbortController | null = null;
const Header = ({ overrides }: { overrides: ServerHeaderOverrides }) => {
  const serverId = router.match<{ serverId: string }>(
    "/app/servers/:serverId/*",
  )?.params.serverId;

  if (!serverId) return null;

  const server = serverStore.servers.get(serverId);
  if (!server) return null;

  headerAc?.abort();
  headerAc = new AbortController();
  const { signal } = headerAc;

  requestAnimationFrame(() => {
    if (signal.aborted) return;
    bannerCroppedHandler(
      document.querySelector(`.${style.banner!}`) as HTMLDivElement,
      signal,
    );
  });

  return (
    <div class={style.header}>
      <div class={style.banner}>
        <Banner server={server} image={overrides.banner} />
      </div>
      <div class={style.overlayInfo}>
        <Avatar
          server={server}
          size={isMobileWidth() ? 96 : 128}
          image={overrides.avatar}
        />
      </div>

      <div class={[style.section, style.detailsSection]}>
        <div>{overrides.name ?? server.name}</div>
        <Stats />
      </div>
    </div>
  );
};

const createServerSettingsRoute = ({ leftDrawer, content }: RouteContext) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let headerContainerEl = (<div></div>) as HTMLDivElement;

  const drawer = createServerSettingsDrawer();

  let innerContent = (<div></div>) as HTMLDivElement;
  let page: Page | undefined = undefined;

  let headerOverride: ServerHeaderOverrides = {};

  let context: ServerSettingsContext = {
    content: innerContent,
    overrideHeader(override) {
      headerOverride = { ...headerOverride, ...override };
      renderHeader();
    },
  };

  const renderHeader = () => {
    morphdom(
      headerContainerEl,
      <div>
        <Header overrides={headerOverride} />
      </div>,
      {
        childrenOnly: true,
      },
    );
  };

  storeEmitter.on("drawer:modeChange", renderHeader, signal);

  router.createMatchListener("*", renderHeader, {
    signal,
    always: true,
    defer: true,
  });

  const renderPage = () => {
    const serverId = router.match<{ serverId: string }>(
      "/app/servers/:serverId/*",
    )?.params.serverId;

    const matchedRoute = ServerSettings.find((s) =>
      router.match("/app/servers/:serverId/settings" + s.path),
    );
    if (!matchedRoute) {
      router.navigate(
        `/app/servers/${serverId}/settings` + ServerSettings[0]!.path,
        {
          replace: true,
        },
      );
      return;
    }
    getAppHeader()?.updateHeader({
      icon: matchedRoute.icon,
      label: matchedRoute.name(),
    });

    const user = accountStore.currentUser;
    if (!user) return;
    page?.destroy();
    page = matchedRoute.load.create(context);
  };

  const render = () => {
    renderHeader();
    content.replaceChildren(
      <div class={style.content}>
        {headerContainerEl}
        {innerContent}
      </div>,
    );
    renderPage();
  };
  render();

  leftDrawer.replaceChildren(drawer.render());

  router.createMatchListener("/app/settings/*", renderPage, {
    signal,
    always: true,
    defer: true,
  });

  storeEmitter.on("ws:authStateUpdate", render, signal);

  const destroy = () => {
    page?.destroy();
    page = undefined;

    headerAc?.abort();
    abortController.abort();
    getAppHeader()?.updateHeader({ trigger: false });
    drawer.destroy();

    innerContent.remove();
    (innerContent as any) = null;

    headerContainerEl.remove();
    (headerContainerEl as any) = null;

    (context as any) = null;
  };

  return { destroy };
};

export default createServerSettingsRoute;
