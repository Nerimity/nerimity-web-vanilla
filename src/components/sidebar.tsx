import { t } from "@lingui/core/macro";
import morphdom from "morphdom";
import type Sortable from "sortablejs";

import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { friendStore } from "../store/friendStore";
import { inboxStore } from "../store/inboxStore";
import {
  MessageMention,
  messageMentionStore,
} from "../store/messageMentionStore";
import { Server, serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { FriendStatus, type RawServerFolder } from "../Types";
import { closestFromEvent } from "../utils/dom";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { lazySortable } from "../utils/lazySortable";
import { getRecentServerChannelId } from "../utils/recentServerChannels";
import { router } from "../utils/router";
import { Icon } from "./icon";
import { LogoMono } from "./LogoMono";
import { NotificationPill } from "./NotificationPill";
import { createResizeHandler } from "./ResizeHandle";
import { Avatar } from "./ui/avatar";
import { Drawer } from "./ui/drawer";
import { Item } from "./ui/item";

import style from "./sidebar.module.css";

const openedFolderIds = new Set<string>();
const folderItemAbortControllers = new Map<string, AbortController>();

const SidebarItem = (props: {
  title?: string;
  href?: string;
  selected?: boolean;
  children?: any;
  class?: any;
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
      data-tooltip={server.name}
      href={`/app/servers/${server.id}/${getRecentServerChannelId(server.id)}`}
    >
      <Avatar
        size={42}
        server={server}
        imgClass="avatar"
        hoverSelector={`.${style.sidebarItem}`}
      />
    </SidebarItem>
  );
};

const CreatingFolderPreview = ({ servers }: { servers: Server[] }) => (
  <div
    class={style.folderPreview}
    style={{
      position: "absolute",
      width: "100%",
      height: "100%",
      aspectRatio: "auto",
      "--override-size":
        "calc(var(--container-width) - var(--container-width)* 0.66)",
    }}
  >
    {servers.map((server) => (
      <Avatar size={24} server={server} imgClass="avatar" />
    ))}
  </div>
);

const setupServerDragPreview = (
  serverListEl: HTMLElement,
  signal: AbortSignal,
) => {
  let draggedOverEl: HTMLDivElement | null = null;
  let draggedOverOriginalBackgroundColor = "";
  let draggedServerId: string | null = null;
  let draggedPreviewPlaceholder: HTMLElement | null = null;
  let draggedPreviewAvatar: HTMLElement | null = null;
  let draggedServerPreview: HTMLElement | null = null;
  let draggedTargetAvatar: HTMLElement | null = null;
  let draggedTargetAvatarDisplay = "";
  let draggedTargetColor = "";

  const clearDraggedPreview = () => {
    if (draggedPreviewPlaceholder && draggedPreviewAvatar?.isConnected) {
      draggedPreviewAvatar.replaceWith(draggedPreviewPlaceholder);
    }
    draggedServerPreview?.remove();
    if (draggedTargetAvatar) {
      draggedTargetAvatar.style.display = draggedTargetAvatarDisplay;
    }
    if (draggedOverEl?.classList.contains("serverItem")) {
      draggedOverEl.classList.remove(
        style.folderItem!,
        "folderItem",
        style.creatingFolderPreview!,
      );
      if (draggedTargetColor) {
        draggedOverEl.style.setProperty("--color", draggedTargetColor);
      } else {
        draggedOverEl.style.removeProperty("--color");
      }
    }
    draggedPreviewPlaceholder = null;
    draggedPreviewAvatar = null;
    draggedServerPreview = null;
    draggedTargetAvatar = null;
  };

  const setDraggedOverEl = (el: HTMLDivElement | null) => {
    if (el?.dataset.opened === "true") el = null;
    if (el?.classList.contains("serverItem")) {
      if (el.dataset.serverId === draggedServerId) el = null;
    }
    if (draggedOverEl === el) return;
    if (draggedOverEl) {
      draggedOverEl.style.backgroundColor = draggedOverOriginalBackgroundColor;
    }
    clearDraggedPreview();

    draggedOverEl = el;
    if (el) {
      draggedOverOriginalBackgroundColor = el.style.backgroundColor;
      el.style.backgroundColor = "var(--primary-color)";

      const folder = accountStore.currentUser?.serverFolders.find(
        (item) => item.id === el.dataset.serverId,
      );
      if (!draggedServerId) return;

      const server = serverStore.servers.get(draggedServerId);
      if (!server) return;

      if (folder) {
        if (
          folder.serverIds.length >= 4 ||
          folder.serverIds.includes(draggedServerId)
        ) {
          return;
        }

        const placeholder = el.querySelector<HTMLElement>(
          `.${style.folderPreview} .${style.placeholder}`,
        );
        if (!placeholder) return;

        const avatar = (
          <Avatar size={24} server={server} imgClass="avatar" />
        ) as HTMLElement;
        placeholder.replaceWith(avatar);
        draggedPreviewPlaceholder = placeholder;
        draggedPreviewAvatar = avatar;
        return;
      }

      if (!el.classList.contains("serverItem")) return;
      const targetServer = serverStore.servers.get(el.dataset.serverId ?? "");
      const targetAvatar = el.querySelector<HTMLElement>(".avatar");
      if (!targetServer || !targetAvatar) return;

      const preview = (
        <CreatingFolderPreview servers={[targetServer, server]} />
      ) as HTMLElement;
      draggedTargetAvatar = targetAvatar;
      draggedTargetAvatarDisplay = targetAvatar.style.display;
      draggedTargetColor = el.style.getPropertyValue("--color");
      el.classList.add(
        style.folderItem!,
        "folderItem",
        style.creatingFolderPreview!,
      );
      el.style.setProperty("--color", "var(--primary-color)");
      targetAvatar.style.display = "none";
      el.append(preview);
      draggedServerPreview = preview;
    }
  };

  serverListEl.addEventListener(
    "dragstart",
    (event) => {
      const serverItem = closestFromEvent<HTMLDivElement>(event, ".serverItem");
      draggedServerId = serverItem?.dataset.serverId ?? null;
    },
    { signal },
  );
  const finishDrag = () => {
    setDraggedOverEl(null);
    draggedServerId = null;
  };
  serverListEl.addEventListener(
    "dragenter",
    (event) => {
      const el = closestFromEvent<HTMLDivElement>(
        event,
        ".folderItem, .serverItem",
      );
      if (el) setDraggedOverEl(el);
    },
    { signal },
  );
  serverListEl.addEventListener(
    "dragleave",
    (event) => {
      if (!draggedOverEl) return;
      const el = closestFromEvent<HTMLDivElement>(
        event,
        ".folderItem, .serverItem",
      );
      if (el && el !== draggedOverEl) return;
      if (
        event.relatedTarget instanceof Node &&
        draggedOverEl.contains(event.relatedTarget)
      ) {
        return;
      }

      setDraggedOverEl(null);
    },
    { signal },
  );
  serverListEl.addEventListener("drop", finishDrag, { signal });
  serverListEl.addEventListener("dragend", finishDrag, { signal });

  let touchDragTimer: ReturnType<typeof setTimeout> | null = null;
  let touchDragReady = false;
  let touchStartX = 0;
  let touchStartY = 0;

  const clearTouchDrag = () => {
    if (touchDragTimer !== null) {
      clearTimeout(touchDragTimer);
      touchDragTimer = null;
    }
    touchDragReady = false;
    finishDrag();
  };

  serverListEl.addEventListener(
    "touchstart",
    (event) => {
      if (!closestFromEvent(event, ".serverItem, .folderItem")) return;
      const touch = event.touches[0];
      if (!touch) return;

      clearTouchDrag();
      const serverItem = closestFromEvent<HTMLDivElement>(event, ".serverItem");
      draggedServerId = serverItem?.dataset.serverId ?? null;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchDragTimer = setTimeout(() => {
        touchDragReady = true;
      }, 200);
    },
    { signal, passive: true },
  );
  document.addEventListener(
    "touchmove",
    (event) => {
      if (!touchDragReady) return;
      const touch = event.touches[0];
      if (
        !touch ||
        Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY) < 5
      ) {
        return;
      }

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropTarget =
        target?.closest<HTMLDivElement>(".folderItem, .serverItem") ?? null;
      setDraggedOverEl(
        dropTarget && serverListEl.contains(dropTarget) ? dropTarget : null,
      );
    },
    { signal, passive: true },
  );
  document.addEventListener("touchend", clearTouchDrag, { signal });
  document.addEventListener("touchcancel", clearTouchDrag, { signal });
};

const FolderItem = ({
  folder,
  signal,
}: {
  folder: RawServerFolder;
  signal: AbortSignal;
}) => {
  folderItemAbortControllers.get(folder.id)?.abort();

  const abortController = new AbortController();
  folderItemAbortControllers.set(folder.id, abortController);
  const abortFromParent = () => abortController.abort();
  signal.addEventListener("abort", abortFromParent, { once: true });

  let sortable: Sortable | null = null;
  abortController.signal.addEventListener(
    "abort",
    () => {
      signal.removeEventListener("abort", abortFromParent);
      sortable?.destroy();
      if (folderItemAbortControllers.get(folder.id) === abortController) {
        folderItemAbortControllers.delete(folder.id);
      }
    },
    { once: true },
  );

  const notifications = serverStore.notificationsMemo.value();
  const hasNotifications = !!folder.serverIds.find((id) => notifications[id]);

  const arr = Array(4).fill(undefined);

  const opened = openedFolderIds.has(folder.id);

  const selectedServer = folder.serverIds.includes(
    serverStore.currentServerId!,
  );

  const folderServerList = opened
    ? ((
        <div class={style.folderServerList}>
          {folder.serverIds.map((id) => {
            const server = serverStore.servers.get(id);
            if (!server) return null;
            return <ServerItem server={server} />;
          })}
        </div>
      ) as HTMLDivElement)
    : null;
  const el = (
    <SidebarItem
      class={[style.folderItem, "folderItem"]}
      data-server-id={folder.id}
      alert={hasNotifications}
      data-tooltip={folder.name}
      style={{ "--color": folder.color }}
      selected={!opened && selectedServer}
      data-opened={opened}
    >
      <div
        class={style.folderPreview}
        style={{
          "--override-size":
            "calc(var(--container-width) - var(--container-width)* 0.66)",
        }}
      >
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
      {folderServerList}
    </SidebarItem>
  );

  (async () => {
    const Sortable = await lazySortable();
    if (abortController.signal.aborted) return;
    if (!folderServerList) return;

    const folderEl = Array.from(
      document.querySelectorAll<HTMLElement>(`.folderItem`),
    ).find((el) => el.dataset.serverId === folder.id);
    const currentFolderServerList = folderEl?.querySelector<HTMLElement>(
      `.${style.folderServerList}`,
    );
    if (!currentFolderServerList) return;

    // folder
    sortable = new Sortable(currentFolderServerList, {
      delayOnTouchOnly: true,
      delay: 200,
      touchStartThreshold: 5,
      group: {
        name: "server",
        // Prevent folders from being nested inside other folders.
        put: (_to, _from, dragged) =>
          !dragged.classList.contains(".folderItem"),
      },
      draggable: `.serverItem`,
      filter: ".ignoreDrag",

      // onAdd: handleEvent,
      // onUpdate: handleEvent,
    });
  })();

  return el;
};

const updateServerItemSelectedState = (
  container: HTMLElement,
  serverId?: string | null,
) => {
  const selectedEls = container.querySelectorAll(
    `.serverItem[data-selected="true"], .folderItem[data-selected="true"]`,
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

const rerenderFolder = (folderId: string, rerenderSignal: AbortSignal) => {
  const folder = accountStore.currentUser?.serverFolders.find(
    (f) => f.id === folderId,
  );
  if (!folder) return;
  const container = document.querySelector(
    `.folderItem[data-server-id="${folder.id}"]`,
  );
  if (!container) return;
  morphdom(container, <FolderItem signal={rerenderSignal} folder={folder} />);
};

const rerenderServerItem = (serverId: string, rerenderSignal: AbortSignal) => {
  const folderId = serverStore
    .orderedServers()
    .serverIdToFolderId.get(serverId);
  if (folderId) {
    rerenderFolder(folderId, rerenderSignal);
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

  let sortable: Sortable | null = null;

  let rerenderAc = new AbortController();

  setupServerDragPreview(serverListEl, signal);

  const renderList = async (opts?: {
    id?: string;
    forceRecreate?: boolean;
  }) => {
    rerenderAc.abort();
    rerenderAc = new AbortController();

    sortable?.destroy();
    sortable = null;
    const Sortable = await lazySortable();
    if (rerenderAc.signal.aborted) return;

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
          <FolderItem signal={rerenderAc.signal} folder={item.folder} />
        ),
      shouldRecreate(_, item) {
        if (opts?.forceRecreate) return true;
        return opts?.id === item.id;
      },
    });

    // main
    sortable = new Sortable(serverListEl, {
      delayOnTouchOnly: true,
      delay: 200,
      touchStartThreshold: 5,
      invertSwap: true,
      swapThreshold: 0.5,
      draggable: `.serverItem, .folderItem`,
      group: "server",
      filter: ".ignoreDrag",
      // onAdd: handleEvent,
      // onUpdate: handleEvent,
    });
  };

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
      rerenderServerItem(event.serverId, rerenderAc.signal);
    },
    signal,
  );
  storeEmitter.on(
    "server:add",
    (event) => {
      renderList({ id: event.server.id });
    },
    signal,
  );
  storeEmitter.on(
    "server:remove",
    (event) => {
      renderList({ id: event.serverId });
    },
    signal,
  );

  storeEmitter.on(
    "server:member_update",
    (event) => {
      if (!event.isMe) return;
      rerenderServerItem(event.serverId, rerenderAc.signal);
    },
    signal,
  );
  storeEmitter.on(
    "server:update_role",
    (event) => {
      if (!event.hasRole) return;
      rerenderServerItem(event.serverId, rerenderAc.signal);
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

  const updateAvatarSize = () => {
    const containerWidth = resizeHandler.currentWidth;
    containerEl?.style.setProperty("--container-width", containerWidth + "px");

    containerEl?.style.setProperty(
      "--override-size",
      "calc(var(--container-width) - var(--container-width)* 0.4)",
    );
  };
  const resizeHandler = createResizeHandler({
    signal: signal,
    position: "right",
    store: "sidebarWidth",
    initial: 76,
    max: 100,
    min: 54,
    onResize: updateAvatarSize,
  });

  const render = () => {
    containerEl = (
      <div class={style.sidebar}>
        {resizeHandler.element}
        <div class={style.scrollable}>
          <HomeItem signal={signal} />
          <MentionList signal={signal} />
          {serverListEl}
        </div>
        <div class={style.footer}>
          <SettingsItem signal={signal} />
          <ProfileItem signal={signal} />
        </div>
      </div>
    ) as HTMLElement;
    hoverAnimator = new HoverAnimator(serverListEl, [
      { trigger: `.${style.sidebarItem}`, image: "img.avatar" },
    ]);
    renderList();
    updateAvatarSize();

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
      const folder = closestFromEvent(event, `.${style.folderPreview}`);
      if (folder) {
        handleFolderClick(folder.parentElement!.dataset.serverId!);
      }
    },
    { signal },
  );

  const destroy = () => {
    rerenderAc.abort();
    abortController.abort();
    sortable?.destroy();
    sortable = null;
    hoverAnimator?.destroy();

    serverListEl.remove();
    (serverListEl as any) = null;

    containerEl?.remove();
    containerEl = null;
    hoverAnimator = null;
  };

  return {
    destroy,
    render,
  };
};

const ProfileItem = (props: { signal: AbortSignal }) => {
  const { signal } = props;
  let el = (
    <SidebarItem data-tooltip={t`Profile`} href="#" data-options></SidebarItem>
  ) as HTMLDivElement;

  const rerender = () => {
    if (accountStore.authenticated) {
      el.setAttribute("href", `/app/profile/${accountStore.currentUser?.id}`);
      el.replaceChildren(
        <Avatar
          user={accountStore.currentUser}
          size={42}
          hoverSelector={`.${style.sidebarItem}`}
        />,
      );
    }
  };

  storeEmitter.on("ws:authStateUpdate", rerender, signal);

  return el;
};

const SettingsItem = (props: { signal: AbortSignal }) => {
  const matcher = "/app/settings/*";
  const match = router.match(matcher);

  const createEl = () => {
    return (
      <SidebarItem
        selected={!!match}
        class={style.homeItem}
        data-tooltip={t`Settings`}
        href="/app/settings"
      >
        <Icon name="settings" />
      </SidebarItem>
    ) as HTMLDivElement;
  };
  let el = createEl();

  router.createMatchListener(
    matcher,
    (match) => {
      el?.setAttribute("data-selected", match ? "true" : "false");
    },
    { signal: props.signal },
  );

  return el;
};

const MentionItem = ({ mention }: { mention: MessageMention }) => {
  const notifications = mention.count;

  const user =
    userStore.users.get(mention.mentionedBy.id) || mention.mentionedBy;

  const inbox = inboxStore.inboxes.get(mention.channelId);

  return (
    <SidebarItem
      class="mentionItem"
      data-user-id={user.id}
      data-channel-id={mention.channelId}
      alert={notifications}
      selected={channelStore.currentChannelId === mention.channelId}
      data-tooltip={user.username}
      href={inbox ? `/app/inbox/${mention.channelId}` : undefined}
    >
      <Avatar
        size={42}
        user={user}
        imgClass="avatar"
        hoverSelector={`.${style.sidebarItem}`}
      />
    </SidebarItem>
  );
};

const MentionList = (props: { signal: AbortSignal }) => {
  const el = (<div></div>) as HTMLDivElement;

  const rerender = (channelId?: string) => {
    const mentions = messageMentionStore.mentions.array();
    const dmMentions = mentions.filter((m) => !m.serverId);

    reconcile({
      values: dmMentions,
      container: el,
      dataAttr: "channel-id",
      valueId: "channelId",
      create(item) {
        return <MentionItem mention={item} />;
      },
      shouldRecreate(_, item) {
        if (!channelId) return false;
        return channelId === item.channelId;
      },
    });
  };

  el.addEventListener(
    "click",
    (event) => {
      const itemEl = closestFromEvent(event, ".mentionItem[data-user-id]");
      if (!itemEl) return;
      const userId = itemEl.dataset.userId;
      if (!userId) return;
      inboxStore.openChannel(userId);
      Drawer().updatePage({ page: 1 });
    },
    { signal: props.signal },
  );
  rerender();

  storeEmitter.on(
    "channel:notify_update",
    (event) => {
      if (event.serverId) return;
      rerender(event.channelId);
    },
    props.signal,
  );
  storeEmitter.on("ws:authStateUpdate", () => rerender(), props.signal);
  storeEmitter.on(
    "mention:dm_update",
    (e) => rerender(e.channelId),
    props.signal,
  );

  return el;
};

const HomeItem = (props: { signal: AbortSignal }) => {
  const match = router.match("/app{/inbox/*}?");

  const createEl = () => {
    const count = friendStore.friends
      .array()
      .filter((f) => f.status === FriendStatus.PENDING).length;

    return (
      <SidebarItem
        selected={!!match}
        alert={count}
        class={style.homeItem}
        data-tooltip={t`Home`}
        href="/app"
      >
        <div class={style.logoContainer}>
          <LogoMono />
        </div>
      </SidebarItem>
    ) as HTMLDivElement;
  };
  let el = createEl();

  const rerender = () => {
    const nextEl = createEl();
    el.replaceWith(nextEl);
    el = nextEl;
  };

  storeEmitter.on("friend:request", rerender, props.signal);
  storeEmitter.on("ws:authStateUpdate", rerender, props.signal);

  router.createMatchListener(
    "/app{/inbox/*}?",
    (match) => {
      el?.setAttribute("data-selected", match ? "true" : "false");
    },
    { signal: props.signal },
  );

  return el;
};
