import morphdom from "morphdom";

import { h } from "../h";
import { accountStore } from "../store/accountStore";
import { Server, serverStore } from "../store/serverStore";
import type { RawServerFolder } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { getRecentServerChannelId } from "../utils/recentServerChannels";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { Item } from "./item";
import { LogoMono } from "./LogoMono";
import { NotificationPill } from "./NotificationPill";

import style from "./sidebar.module.css";

const openedFolderIds = new Set<string>();

const SidebarItem = (props: {
  title?: string;
  href?: string;
  selected?: boolean;
  children?: any;
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

const ServerItem = ({ server }: { server: Server }) => {
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

const FolderItem = ({ folder }: { folder: RawServerFolder }) => {
  const notifications = serverStore.notificationsMemo.value();
  const hasNotifications = !!folder.serverIds.find((id) => notifications[id]);

  const arr = Array(4).fill(undefined);

  const opened = openedFolderIds.has(folder.id);

  const selectedServer = folder.serverIds.includes(
    serverStore.currentServerId!,
  );

  return (
    <SidebarItem
      class={style.folderItem}
      data-server-id={folder.id}
      alert={hasNotifications}
      title={folder.name}
      style={{ "--color": folder.color }}
      selected={!opened && selectedServer}
      data-opened={opened}
    >
      <div class={style.folderPreview}>
        {!opened ? (
          arr.map((_, i) => {
            const id = folder.serverIds[i];
            if (!id) return <div class={style.placeholder} />;
            const server = serverStore.servers.get(id);
            if (!server) return null;
            return <Avatar size={24} server={server} imgClass="avatar" />;
          })
        ) : (
          <Icon name="folder_open" class={style.folderIcon} />
        )}
      </div>
      {opened && (
        <div class={style.folderServerList}>
          {folder.serverIds.map((id) => {
            const server = serverStore.servers.get(id);
            if (!server) return null;
            return <ServerItem server={server} />;
          })}
        </div>
      )}
    </SidebarItem>
  );
};

const updateServerItemSelectedState = (
  container: HTMLElement,
  serverId?: string | null,
) => {
  const selectedEls = container.querySelectorAll(
    `.serverItem[data-selected="true"], .${style.folderItem}[data-selected="true"]`,
  );

  selectedEls.forEach((el) => el.removeAttribute("data-selected"));

  if (!serverId) return;

  const folderId = serverStore
    .orderedServers()
    .serverIdToFolderId.get(serverId);
  if (folderId) {
    const folderItem = container.querySelector(
      `[data-server-id="${folderId}"]`,
    );
    folderItem?.setAttribute("data-selected", "true");
  }

  const item = container.querySelector(`[data-server-id="${serverId}"].item`);
  item?.setAttribute("data-selected", "true");
};

const rerenderFolder = (folderId: string) => {
  const folder = accountStore.currentUser?.serverFolders.find(
    (f) => f.id === folderId,
  );
  if (!folder) return;
  const container = document.querySelector(
    `.${style.folderItem}[data-server-id="${folder.id}"]`,
  );
  if (!container) return;
  morphdom(container, <FolderItem folder={folder} />);
};

const rerenderServerItem = (serverId: string) => {
  const folderId = serverStore
    .orderedServers()
    .serverIdToFolderId.get(serverId);
  if (folderId) {
    rerenderFolder(folderId);
  }

  const serverEl = document.querySelector(
    `.serverItem[data-server-id="${serverId}"]`,
  );
  if (!serverEl) return;
  const server = serverStore.servers.get(serverId);
  if (!server) return;
  morphdom(serverEl, <ServerItem server={server} />);
};

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
    const servers = serverStore
      .orderedServers()
      .servers.filter(
        (s) => (s.type === "s" && !s.isInFolder) || s.type === "f",
      );
    reconcile({
      container: serverListEl,
      dataAttr: "server-id",
      values: servers,
      valueId: "id",
      create: (item) =>
        item.type === "s" ? (
          <ServerItem server={item.server} />
        ) : (
          <FolderItem folder={item.folder} />
        ),
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
      rerenderServerItem(event.serverId);
    },
    signal,
  );

  storeEmitter.on(
    "server:member_update",
    (event) => {
      if (!event.isMe) return;
      rerenderServerItem(event.serverId);
    },
    signal,
  );
  storeEmitter.on(
    "server:update_role",
    (event) => {
      if (!event.hasRole) return;
      rerenderServerItem(event.serverId);
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
      updateServerItemSelectedState(containerEl, serverStore.currentServerId);
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
        <div class={style.footer}>
          <ProfileItem signal={signal} />
        </div>
      </div>
    ) as HTMLElement;
    hoverAnimator = new HoverAnimator(serverListEl, [
      { trigger: `.${style.sidebarItem}`, image: "img.avatar" },
    ]);
    renderList();
    return containerEl;
  };

  const handleFolderClick = (folderId: string) => {
    const opened = openedFolderIds.has(folderId);
    if (opened) openedFolderIds.delete(folderId);
    else openedFolderIds.add(folderId);
    renderList({ id: folderId });
  };

  serverListEl.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const folder = target.closest(
        `.${style.folderPreview}`,
      ) as HTMLElement | null;
      if (folder) {
        handleFolderClick(folder.parentElement!.dataset.serverId!);
      }
    },
    { signal },
  );

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

const ProfileItem = (props: { signal: AbortSignal }) => {
  const { signal } = props;
  let el = (
    <SidebarItem href="#" data-options></SidebarItem>
  ) as HTMLDivElement;

  const rerender = () => {
    if (accountStore.authenticated) {
      el.setAttribute("href", `/app/profile/${accountStore.currentUser?.id}`);
      el.replaceChildren(<Avatar user={accountStore.currentUser} size={42} />);
    }
  };

  storeEmitter.on("ws:authStateUpdate", rerender, signal);

  return el;
};
