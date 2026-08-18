import { h, Fragment } from "../h";
import { channelStore, type Channel } from "../store/channelStore";
import { serverStore } from "../store/serverStore";
import { ChannelType } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { CdnIcon } from "./cdnIcon";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { Item } from "./item";
import {
  handleTypingIndicator,
  typingEmitter,
} from "./message-pane/typingIndicator";
import { NotificationPill } from "./NotificationPill";
import { createPillUpdater, Pill } from "./Pill";

import style from "./serverChannelList.module.css";

const HeaderPill = () => {
  const server = serverStore.currentServer();
  return (
    <Pill
      server={server}
      label={server?.name}
      suffix={
        server?.verified ? (
          <Icon name="verified" class={style.verifiedIcon} />
        ) : undefined
      }
    />
  );
};

export const createServerChannelList = () => {
  let channelListEl = (
    <div class={style.serverChannelList}></div>
  ) as HTMLDivElement;

  let containerEl = (
    <div class={style.outerContainer}>
      <div class={style.headerBackdrop}></div>
      <div class={[style.container, "scrollbarHover"]}>
        <div class={style.header}>
          <HeaderPill />
        </div>

        {channelListEl}
      </div>
    </div>
  ) as HTMLDivElement;
  const updatePill = createPillUpdater(() => containerEl, HeaderPill);

  let hoverAnimator: HoverAnimator | null = null;
  const abortController = new AbortController();
  const { signal } = abortController;

  const renderList = (opts?: {
    channelId?: string;
    forceRecreate?: boolean;
  }) => {
    const serverChannels = serverStore.currentChannelsSorted.value() || [];

    handleTypingIndicator?.updateChannelIds(serverChannels.map((c) => c.id));

    if (!channelListEl) return;

    if (!serverChannels.length) {
      channelListEl.replaceChildren();
      return;
    }

    reconcile({
      container: channelListEl,
      dataAttr: "channel-id",
      values: serverChannels,
      valueId: "id",
      create: channelItemHelper.create,
      shouldRecreate(_, item) {
        if (opts?.forceRecreate) return true;
        return opts?.channelId === item.id;
      },
    });
  };

  serverStore.currentChannelsSorted.onUpdate(() => renderList(), signal);
  storeEmitter.on(
    "noti_settings:update",
    () => renderList({ forceRecreate: true }),
    signal,
  );

  storeEmitter.on(
    "channel:notify_update",
    (event) => {
      const currentServer = event.serverId === serverStore.currentServerId;
      if (!currentServer) return;
      renderList(event);
    },
    signal,
  );
  storeEmitter.on(
    "server:update_role",
    (event) => {
      if (!event.hasRole) return;
      renderList();
    },
    signal,
  );

  storeEmitter.on(
    "navigate:channelId",
    () => {
      channelItemHelper.updateSelected(
        channelListEl!,
        channelStore.currentChannelId!,
      );
    },
    signal,
  );
  storeEmitter.on("ws:authStateUpdate", updatePill, signal);
  storeEmitter.on("navigate:serverId", updatePill, signal);

  const render = () => {
    hoverAnimator = new HoverAnimator(containerEl, [
      {
        trigger: `.${style.channelItem}:not(.${style.categoryItem})`,
        image: ".channelIcon img",
        crossAnimate: {
          attr: "data-category-id",
          targetAttr: "data-channel-id",
          target: "img",
        },
      },
      { trigger: `.${style.categoryItem}`, image: ".channelIcon img" },
    ]);

    channelListEl.addEventListener(
      "click",
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(`.${style.channelItem}`)) {
          Drawer().updatePage({ page: 1 });
        }
      },
      { signal },
    );

    renderList();

    return containerEl;
  };

  const destroy = () => {
    abortController.abort();
    hoverAnimator?.destroy();
    channelListEl.remove();
    (channelListEl as any) = null;

    containerEl?.remove();
    (containerEl as any) = null;
  };

  // payload[channelId] = userIds[]
  typingEmitter.on(
    "typing:update",
    (typingChannels) => {
      const channelEls = channelListEl.querySelectorAll(
        `.${style.channelItem}`,
      );
      channelEls.forEach((c) => {
        const el = c as HTMLDivElement;
        const typingEl = el.querySelector(
          `.${style.typingIcon}`,
        ) as HTMLDivElement;
        typingEl?.classList.toggle(
          style.hide!,
          !typingChannels[el.dataset.channelId!],
        );
      });
    },
    signal,
  );

  return {
    destroy,
    render,
  };
};

const createChannelItemHelper = () => {
  const create = (channel: Channel) => {
    const isCategory = channel.type === ChannelType.CATEGORY;

    const notification = channelStore.notificationsMemo.value()[channel.id];

    return (
      <Item.Base
        class={[style.channelItem, isCategory && style.categoryItem]}
        data-channel-id={channel.id}
        title={channel.name}
        href={
          isCategory
            ? undefined
            : `/app/servers/${channel.serverId}/${channel.id}`
        }
        disabled={isCategory}
        selected={channelStore.currentChannelId === channel.id}
        alert={!!notification}
        data-category-id={channel.categoryId}
      >
        <>
          <CdnIcon
            class="channelIcon"
            size={isCategory ? 10 : 16}
            channel={channel}
          />
          <Item.Label
            class={[style.itemLabel, isCategory && style.categoryLabel]}
            size={isCategory ? 12 : 14}
          >
            {channel.name}
          </Item.Label>
          {notification && notification > 0 ? (
            <NotificationPill count={notification} />
          ) : null}

          <Icon
            class={[
              style.typingIcon,
              !handleTypingIndicator?.typingUsers.get(channel.id)?.size &&
                style.hide,
            ]}
            name="more_horiz"
            outlined
          />
        </>
      </Item.Base>
    );
  };

  const updateSelected = (container: HTMLElement, channelId: string) => {
    const selected = container.querySelector(
      `.${style.channelItem}[data-selected="true"]`,
    );

    if (selected) {
      selected.setAttribute("data-selected", "false");
    }

    const item = container.querySelector(
      `.${style.channelItem}[data-channel-id="${channelId}"]`,
    );

    item?.setAttribute("data-selected", "true");
  };

  return {
    updateSelected,
    create,
  };
};

const channelItemHelper = createChannelItemHelper();
