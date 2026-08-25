import { Plural, Trans } from "@trans";
import morphdom from "morphdom";

import { Avatar } from "../../../components/avatar";
import { Banner, bannerCroppedHandler } from "../../../components/Banner";
import { ServerClanItem } from "../../../components/serverClanItem";
import { createSettingsDrawer } from "../../../components/settings/createSettingsDrawer";
import { accountStore } from "../../../store/accountStore";
import { friendStore } from "../../../store/friendStore";
import { serverStore } from "../../../store/serverStore";
import { FriendStatus, type RawUser } from "../../../Types";
import { storeEmitter } from "../../../utils/EventEmitter";
import { getFont } from "../../../utils/font";
import { router } from "../../../utils/router";
import { getAppHeader, type RouteContext } from "../AppPage";
import {
  Settings,
  type HeaderOverrides,
  type Page,
  type SettingsContext,
} from "./Settings";

import style from "./createSettingsRoute.module.css";

const NameAndTag = ({ user }: { user: RawUser }) => {
  const font = getFont(user.profile?.font);

  return (
    <div class={style.nameAndTag}>
      <span class={[style.username, font?.class, "font"]}>{user.username}</span>
      <span class={style.tag}>:{user.tag}</span>
      <span class={style.badges}>
        {user?.profile?.clan && (
          <span class={style.clan}>
            <ServerClanItem clan={user?.profile?.clan} />
          </span>
        )}
      </span>
    </div>
  );
};

const Stats = () => {
  const serverCount = serverStore.servers.size;
  const friendCount = [...friendStore.friends.values()].filter(
    (f) => f.status === FriendStatus.FRIENDS,
  ).length;

  return (
    <div class={style.stats}>
      <span class={style.stat}>
        <Plural
          value={serverCount}
          _0={
            <Trans>
              <span class={style.full}>No</span> Servers
            </Trans>
          }
          one={
            <Trans>
              <span class={style.full}>#</span> Server
            </Trans>
          }
          other={
            <Trans>
              <span class={style.full}>#</span> Servers
            </Trans>
          }
        />
      </span>
      <span class={style.stat}>
        <Plural
          value={friendCount}
          _0={
            <Trans>
              <span class={style.full}>No</span> Friends
            </Trans>
          }
          one={
            <Trans>
              <span class={style.full}>#</span> Friend
            </Trans>
          }
          other={
            <Trans>
              <span class={style.full}>#</span> Friends
            </Trans>
          }
        />
      </span>
    </div>
  );
};

let headerAc: AbortController | null = null;
const Header = ({ overrides }: { overrides: HeaderOverrides }) => {
  const user = accountStore.currentUser;
  if (!user) return null;

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
        <Banner user={user} image={overrides.banner} />
      </div>
      <div class={style.overlayInfo}>
        <Avatar user={user} size={128} image={overrides.avatar} />
      </div>

      <div class={[style.section, style.detailsSection]}>
        <NameAndTag
          user={{
            ...user,
            username: overrides.username ?? user.username,
            tag: overrides.tag ?? user.tag,
          }}
        />

        <Stats />
      </div>
    </div>
  );
};

const createSettingsRoute = ({ leftDrawer, content }: RouteContext) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let headerContainerEl = (<div></div>) as HTMLDivElement;

  const serverChannelList = createSettingsDrawer();

  let innerContent = (<div></div>) as HTMLDivElement;
  let page: Page | undefined = undefined;

  let headerOverride: HeaderOverrides = {};

  let context: SettingsContext = {
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
  const renderPage = () => {
    const matchedRoute = Settings.find((s) =>
      router.match("/app/settings" + s.path),
    );
    if (!matchedRoute) {
      router.navigate("/app/settings" + Settings[0]!.path, { replace: true });
      return;
    }
    getAppHeader()?.updateHeader({
      icon: matchedRoute.icon,
      label: matchedRoute.name(),
    });

    const user = accountStore.currentUser;
    if (!user) return;
    console.log("page create");
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

  leftDrawer.replaceChildren(serverChannelList.render());

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
    serverChannelList.destroy();

    innerContent.remove();
    (innerContent as any) = null;

    headerContainerEl.remove();
    (headerContainerEl as any) = null;

    (context as any) = null;
  };

  return { destroy };
};

export default createSettingsRoute;
