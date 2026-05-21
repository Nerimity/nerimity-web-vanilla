import { css } from "@linaria/core";

import { h } from "../h";
import { Server, serverStore } from "../store/serverStore";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Item } from "./item";
import { Link } from "./link";
import { LogoMono } from "./LogoMono";

const serverItemLink = css`
  overflow: hidden;
  flex-shrink: 0;
  .serverItem {
    padding: 6px 14px;
  }
`;

const homeItem = css`
  display: block;
  border-bottom: solid 1px var(--gray-700);
  margin-top: 4px;
  margin-bottom: 4px;
  padding-bottom: 4px;

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
  }
  .logo {
    width: 42px;
    height: 42px;
  }
  [data-selected="true"] {
    .logoContainer {
      background-color: var(--primary-color);
    }
  }
`;

const SidebarItem = (props: {
  title?: string;
  href: string;
  selected: boolean;
  children?: JSX.Element;
  class?: string;
}) => {
  return (
    <Link class={[serverItemLink, props.class]} href={props.href}>
      <Item.Base class="serverItem" selected={props.selected}>
        {props.children}
      </Item.Base>
    </Link>
  );
};

const createServerItemHelper = () => {
  const create = (server: Server) => (
    <Link
      data-server-id={server.id}
      title={server.name}
      class={serverItemLink}
      href={`/app/servers/${server.id}/${server.defaultChannelId}`}
    >
      <Item.Base
        class="serverItem"
        alert={!!serverStore.notificationsMemo.value()[server.id]}
        selected={serverStore.currentServerId === server.id}
      >
        <Avatar size={42} server={server} imgClass="avatar" />
      </Item.Base>
    </Link>
  );

  const updateSelected = (container: HTMLElement, serverId?: string | null) => {
    const selected = container.querySelector(`.item[data-selected="true"]`);

    if (selected) {
      selected.setAttribute("data-selected", "false");
    }

    if (!serverId) return;

    const item = container.querySelector(
      `[data-server-id="${serverId}"] .item`,
    );
    item?.setAttribute("data-selected", "true");
  };

  return {
    create,
    updateSelected,
  };
};

const serverItem = createServerItemHelper();

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
  }
`;

export const createSidebar = () => {
  let containerEl: HTMLElement | null = null;
  let hoverAnimator: HoverAnimator | null = null;
  const abortController = new AbortController();
  const { signal } = abortController;
  const serverListEl = (<div class="serverList"></div>) as HTMLElement;

  const homeEl = (
    <SidebarItem
      class={homeItem}
      title="Home"
      href="/app"
      selected={!!router.match("/app")}
    >
      <div class="logoContainer">
        <LogoMono />
      </div>
    </SidebarItem>
  ) as HTMLElement;

  const renderList = () => {
    const servers = [...serverStore.servers.values()];
    reconcile({
      container: serverListEl,
      dataAttr: "server-id",
      values: servers,
      valueId: "id",
      create: serverItem.create,
      shouldRecreate(node, item) {
        const domAlert = !!node.querySelector(`[data-alert="true"]`);
        const alert = !!serverStore.notificationsMemo.value()[item.id];
        return domAlert !== alert;
      },
    });
  };

  router.createMatchListener(
    "/app",
    (match) => {
      homeEl.firstElementChild?.setAttribute(
        "data-selected",
        match ? "true" : "false",
      );
    },
    signal,
  );

  storeEmitter.on("server:update", renderList, signal);
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
      serverItem.updateSelected(containerEl, serverStore.currentServerId);
    },
    signal,
  );
  serverStore.notificationsMemo.onUpdate(() => {
    if (!containerEl) return;
    renderList();
  }, signal);

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
      { trigger: `.${serverItemLink}`, image: "img.avatar" },
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
