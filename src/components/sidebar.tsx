import { css } from "@linaria/core";

import { h } from "../h";
import { Server, serverStore } from "../store/serverStore";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Item } from "./item";
import { LogoMono } from "./LogoMono";
import { NotificationPill } from "./NotificationPill";

const sidebarItem = css`
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  width: 64px;
  height: 50px;
  .notify-pill {
    position: absolute;
    top: 6px;
    right: 6px;
  }
`;

const homeItem = css`
  margin-top: 4px;
  &:hover {
    .logoContainer {
      background-color: var(--gray-700);
    }
  }
  .logoContainer {
    corner-shape: squircle;
    border-radius: var(--radius-max);
    transition: background-color 0.2s;
    background-color: var(--gray-800);
    width: 42px;
    height: 42px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .logo {
    width: 42px;
    height: 42px;
  }
  &[data-selected="true"] {
    .logoContainer {
      background-color: var(--primary-color);
    }
  }
`;

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
    <Item.Base class={[sidebarItem, className]} {...rest} alert={!!props.alert}>
      {children}
      {typeof props.alert === "number" && props.alert > 0 && (
        <NotificationPill class="notify-pill" count={props.alert} />
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
        href={`/app/servers/${server.id}/${server.defaultChannelId}`}
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

const sidebar = css`
  display: flex;

  align-items: center;
  flex-direction: column;
  flex-shrink: 0;
  width: 76px;
  height: 100%;
  background-color: var(--sidebar-bg);

  .scrollable {
    &::-webkit-scrollbar {
      display: none;
    }
    overflow: auto;
  }
  .serverList {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 2px;
    border-top: solid 1px var(--gray-700);
    margin-top: 4px;
    margin-bottom: 4px;
    padding-top: 4px;
  }
`;

export const createSidebar = () => {
  let containerEl: HTMLElement | null = null;
  let hoverAnimator: HoverAnimator | null = null;
  const abortController = new AbortController();
  const { signal } = abortController;
  const serverListEl = (<div class="serverList"></div>) as HTMLElement;

  const homeEl = (
    <SidebarItem class={homeItem} title="Home" href="/app">
      <div class="logoContainer">
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
      <div class={sidebar}>
        <div class="scrollable">
          {homeEl}
          {serverListEl}
        </div>
      </div>
    ) as HTMLElement;
    hoverAnimator = new HoverAnimator(serverListEl, [
      { trigger: `.${sidebarItem}`, image: "img.avatar" },
    ]);
    renderList();
    return containerEl;
  };

  const destroy = () => {
    abortController.abort();
    hoverAnimator?.destroy();

    serverListEl.remove();

    containerEl?.remove();
    containerEl = null;
    hoverAnimator = null;
  };

  return {
    destroy,
    render,
  };
};
