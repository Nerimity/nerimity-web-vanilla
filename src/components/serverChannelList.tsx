import { css } from "@linaria/core";

import { h, Fragment } from "../h";
import { channelStore, type Channel } from "../store/channelStore";
import { serverStore } from "../store/serverStore";
import { ChannelType } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { reconcile } from "../utils/html";
import { CdnIcon } from "./cdnIcon";
import { Drawer } from "./drawer";
import { Item } from "./item";
import { Link } from "./link";

const serverChannelList = css`
  display: flex;
  overflow: auto;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  gap: 2px;
  padding-left: 4px;
  padding-right: 4px;
  flex: 1;
`;

export const createServerChannelList = () => {
  let containerEl: HTMLElement | null = null;
  let hoverAnimator: HoverAnimator | null = null;
  const abortController = new AbortController();
  const { signal } = abortController;
  const renderList = () => {
    const serverChannels = serverStore.currentChannelsSorted.value() || [];

    if (!containerEl) return;

    if (!serverChannels.length) {
      containerEl.replaceChildren();
      return;
    }

    reconcile({
      container: containerEl,
      dataAttr: "channel-id",
      values: serverChannels,
      valueId: "id",
      create: channelItemHelper.create,
      shouldRecreate(node, item) {
        const domAlert = !!node.querySelector(`[data-alert="true"]`);
        const alert = !!channelStore.notificationsMemo.value()[item.id];
        return domAlert !== alert;
      },
    });
  };

  serverStore.currentChannelsSorted.onUpdate(renderList, signal);

  storeEmitter.on(
    "navigate:channelId",
    () => {
      channelItemHelper.updateSelected(
        containerEl!,
        channelStore.currentChannelId!,
      );
    },
    signal,
  );

  channelStore.notificationsMemo.onUpdate(() => {
    if (!containerEl) return;
    renderList();
  }, signal);

  const render = () => {
    containerEl = (
      <div class={serverChannelList}></div>
    ) as unknown as HTMLElement;
    hoverAnimator = new HoverAnimator(containerEl, [
      {
        trigger: `.${channelItemLink}:not(.categoryLink)`,
        image: ".channelIcon img",
        crossAnimate: {
          attr: "data-category-id",
          targetAttr: "data-channel-id",
          target: "img",
        },
      },
      { trigger: `.categoryLink`, image: ".channelIcon img" },
    ]);

    containerEl.addEventListener(
      "click",
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(`.${channelItemLink}`)) {
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
    containerEl?.remove();
    containerEl = null;
  };

  return {
    destroy,
    render,
  };
};

const channelItemLink = css`
  .channelItem {
    padding: 6px 6px;
  }

  .categoryLabel {
    color: var(--text-color);
  }

  &.categoryLink {
    margin-bottom: 2px;
    margin-top: 16px;
  }
`;
const createChannelItemHelper = () => {
  const create = (channel: Channel) => {
    const isCategory = channel.type === ChannelType.CATEGORY;
    return (
      <Link
        data-channel-id={channel.id}
        title={channel.name}
        data-route
        class={[channelItemLink, isCategory && "categoryLink"]}
        href={`/app/servers/${channel.serverId}/${channel.id}`}
        {...(channel.categoryId && { "data-category-id": channel.categoryId })}
      >
        <Item.Base
          class="channelItem"
          selected={channelStore.currentChannelId === channel.id}
          alert={!!channelStore.notificationsMemo.value()[channel.id]}
        >
          <>
            <CdnIcon
              class="channelIcon"
              size={isCategory ? 10 : 16}
              channel={channel}
            />
            <Item.Label
              class={[isCategory && "categoryLabel"]}
              size={isCategory ? 12 : 14}
            >
              {channel.name}
            </Item.Label>
          </>
        </Item.Base>
      </Link>
    );
  };

  const updateSelected = (container: HTMLElement, channelId: string) => {
    const selected = container.querySelector(`.item[data-selected="true"]`);

    if (selected) {
      selected.setAttribute("data-selected", "false");
    }

    const item = container.querySelector(
      `[data-channel-id="${channelId}"] .item`,
    );

    item?.setAttribute("data-selected", "true");
  };

  return {
    updateSelected,
    create,
  };
};

const channelItemHelper = createChannelItemHelper();
