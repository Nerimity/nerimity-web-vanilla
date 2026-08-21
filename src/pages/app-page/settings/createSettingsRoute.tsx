import { Plural, Trans } from "@trans";

import { Avatar } from "../../../components/avatar";
import { Banner } from "../../../components/Banner";
import { ServerClanItem } from "../../../components/serverClanItem";
import { createSettingsDrawer } from "../../../components/settings/createSettingsDrawer";
import { h } from "../../../h";
import { accountStore } from "../../../store/accountStore";
import { friendStore } from "../../../store/friendStore";
import { serverStore } from "../../../store/serverStore";
import { FriendStatus, type RawUser } from "../../../Types";
import { storeEmitter } from "../../../utils/EventEmitter";
import { getFont } from "../../../utils/font";
import { router } from "../../../utils/router";
import { getAppHeader, type RouteContext } from "../AppPage";
import { Settings, type Page } from "./Settings";

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
  const friendCount = [...friendStore.friends.values()].map(
    (f) => f.status === FriendStatus.FRIENDS,
  ).length;

  return (
    <div class={style.stats}>
      <span class={style.stat}>
        <Plural
          value={serverCount}
          _0={
            <Trans>
              <span class={style.full}>No</span> servers
            </Trans>
          }
          one={
            <Trans>
              <span class={style.full}>#</span> server
            </Trans>
          }
          other={
            <Trans>
              <span class={style.full}>#</span> servers
            </Trans>
          }
        />
      </span>
      <span class={style.stat}>
        <Plural
          value={friendCount}
          _0={
            <Trans>
              <span class={style.full}>No</span> friends
            </Trans>
          }
          one={
            <Trans>
              <span class={style.full}>#</span> friend
            </Trans>
          }
          other={
            <Trans>
              <span class={style.full}>#</span> friends
            </Trans>
          }
        />
      </span>
    </div>
  );
};

const Header = () => {
  const user = accountStore.currentUser;
  if (!user) return null;

  return (
    <div class={style.header}>
      <div class={style.banner}>
        <Banner user={user} />
      </div>
      <div class={style.overlayInfo}>
        <Avatar user={user} size={128} />
      </div>

      <div class={[style.section, style.detailsSection]}>
        <NameAndTag user={user} />

        <Stats />
      </div>
    </div>
  );
};

const createSettingsRoute = ({ leftDrawer, content }: RouteContext) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const serverChannelList = createSettingsDrawer();

  const innerContent = (<div></div>) as HTMLDivElement;

  const render = () => {
    content.replaceChildren(
      <div class={style.content}>
        <Header />
        {innerContent}
      </div>,
    );
  };
  render();

  leftDrawer.replaceChildren(serverChannelList.render());

  let page: Page | undefined = undefined;

  const context = { content: innerContent };

  router.createMatchListener(
    "/app/settings/*",
    () => {
      const matchedRoute = Settings.find((s) =>
        router.match("/app/settings" + s.path),
      );
      if (!matchedRoute) {
        router.navigate("/app/settings" + Settings[0]!.path, { replace: true });
        return;
      }

      page?.destroy();
      page = matchedRoute.load.create(context);
      getAppHeader()?.updateHeader({
        icon: matchedRoute.icon,
        label: matchedRoute.name(),
      });
    },
    { signal, always: true },
  );

  storeEmitter.on("ws:authStateUpdate", render, signal);

  const destroy = () => {
    abortController.abort();
    getAppHeader()?.updateHeader({ trigger: false });

    serverChannelList.destroy();
  };

  return { destroy };
};

export default createSettingsRoute;
