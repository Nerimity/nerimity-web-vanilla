import { h } from "../h";
import { Server, serverStore } from "../store/serverStore";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { getRecentServerChannelId } from "../utils/recentServerChannels";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Item } from "./item";
import { LogoMono } from "./LogoMono";
import { NotificationPill } from "./NotificationPill";

import style from "./sidebar.module.css";

const SidebarItem = (props: {
  title?: string;
  href: string;
  selected?: boolean;
  children?: JSX.Element;
  class?: string;
  alert?: boolean | number;
  [key: string]: any;
}) => {
  const { children, class: className, ...rest } = props;
  return (
    <Item.Base
      class={[style.sidebarItem, className]}
      {...rest}
      alert={!!props.alert}
    >
      {children}
      {typeof props.alert === "number" && props.alert > 0 && (
        <NotificationPill class={style.notifyPill} count={props.alert} />
      )}
    </Item.Base>
  );
};

const createServerItemHelper = () => {
  const create = (server: Server) => {
    const notifications = serverStore.notificationsMemo.value()[server.id];

    return (
      <SidebarItem
        class="serverItem"
        data-server-id={server.id}
        alert={notifications}
        selected={serverStore.currentServerId === server.id}
        title={server.name}
        href={`/app/servers/${server.id}/${getRecentServerChannelId(server.id)}`}
      >
        <Avatar size={42} server={server} imgClass="avatar" />
      </SidebarItem>
    );
  };

  const updateSelected = (container: HTMLElement, serverId?: string | null) => {
    const selected = container.querySelector(
      `.serverItem[data-selected="true"]`,
    );

    if (selected) {
      selected.setAttribute("data-selected", "false");
    }

    if (!serverId) return;

    const item = container.querySelector(`[data-server-id="${serverId}"].item`);
    item?.setAttribute("data-selected", "true");
  };

  return {
    create,
    updateSelected,
  };
};

const serverItemHelper = createServerItemHelper();

export const createSidebar = () => {
  let containerEl: HTMLElement | null = null;
  let hoverAnimator: HoverAnimator | null = null;
  const abortController = new AbortController();
  const { signal } = abortController;
  let serverListEl = (<div class={style.serverList}></div>) as HTMLElement;

  let homeEl = (
    <SidebarItem class={style.homeItem} title="Home" href="/app">
      <div class={style.logoContainer}>
        <LogoMono />
      </div>
    </SidebarItem>
  ) as HTMLElement;

  const renderList = (opts?: { id?: string; forceRecreate?: boolean }) => {
    const servers = [...serverStore.servers.values()];
    reconcile({
      container: serverListEl,
      dataAttr: "server-id",
      values: servers,
      valueId: "id",
      create: serverItemHelper.create,
      shouldRecreate(_, item) {
        if (opts?.forceRecreate) return true;
        return opts?.id === item.id;
      },
    });
  };

  router.createMatchListener(
    "/app",
    (match) => {
      homeEl.setAttribute("data-selected", match ? "true" : "false");
    },
    { signal },
  );

  storeEmitter.on(
    "recent_server_update",
    (event) => {
      renderList({ id: event.serverId });
    },
    signal,
  );

  storeEmitter.on("server:update", renderList, signal);
  storeEmitter.on(
    "channel:notify_update",
    (event) => {
      if (!event.serverId) return;
      renderList({ id: event.serverId });
    },
    signal,
  );

  storeEmitter.on(
    "server:member_update",
    (event) => {
      if (!event.isMe) return;
      renderList({ id: event.serverId });
    },
    signal,
  );
  storeEmitter.on(
    "server:update_role",
    (event) => {
      if (!event.hasRole) return;
      renderList({ id: event.serverId });
    },
    signal,
  );

  storeEmitter.on(
    "noti_settings:update",
    () => renderList({ forceRecreate: true }),
    signal,
  );

  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      renderList();
    },
    signal,
  );
  storeEmitter.on(
    "navigate:serverId",
    () => {
      if (!containerEl) return;
      serverItemHelper.updateSelected(containerEl, serverStore.currentServerId);
    },
    signal,
  );

  const render = () => {
    containerEl = (
      <div class={style.sidebar}>
        <div class={style.scrollable}>
          {homeEl}
          {serverListEl}
        </div>
      </div>
    ) as HTMLElement;
    hoverAnimator = new HoverAnimator(serverListEl, [
      { trigger: `.${style.sidebarItem}`, image: "img.avatar" },
    ]);
    renderList();
    return containerEl;
  };

  const destroy = () => {
    abortController.abort();
    hoverAnimator?.destroy();

    serverListEl.remove();
    (serverListEl as any) = null;

    containerEl?.remove();
    containerEl = null;
    hoverAnimator = null;
    (homeEl as any) = null;
  };

  return {
    destroy,
    render,
  };
};
