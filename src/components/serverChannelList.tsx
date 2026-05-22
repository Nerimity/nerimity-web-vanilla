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

const serverChannelList = css`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  gap: 2px;
  padding-left: 6px;
  --padding-right: 2px;
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
        const domAlert = !!node.matches(`[data-alert="true"]`);
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
      <div class={[serverChannelList, "scrollbarHover"]}></div>
    ) as unknown as HTMLElement;
    hoverAnimator = new HoverAnimator(containerEl, [
      {
        trigger: `.${channelItem}:not(.categoryItem)`,
        image: ".channelIcon img",
        crossAnimate: {
          attr: "data-category-id",
          targetAttr: "data-channel-id",
          target: "img",
        },
      },
      { trigger: `.categoryItem`, image: ".channelIcon img" },
    ]);

    containerEl.addEventListener(
      "click",
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(`.${channelItem}`)) {
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

const channelItem = css`
  padding: 6px 6px;
  border-radius: var(--radius-8);

  .categoryLabel {
    color: var(--text-color);
  }

  &.categoryItem {
    margin-bottom: 2px;
    margin-top: 16px;
  }
`;
const createChannelItemHelper = () => {
  const create = (channel: Channel) => {
    const isCategory = channel.type === ChannelType.CATEGORY;
    return (
      <Item.Base
        class={[channelItem, isCategory && "categoryItem"]}
        data-channel-id={channel.id}
        title={channel.name}
        href={
          isCategory
            ? undefined
            : `/app/servers/${channel.serverId}/${channel.id}`
        }
        disabled={isCategory}
        selected={channelStore.currentChannelId === channel.id}
        alert={!!channelStore.notificationsMemo.value()[channel.id]}
        data-category-id={channel.categoryId}
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
    );
  };

  const updateSelected = (container: HTMLElement, channelId: string) => {
    const selected = container.querySelector(
      `.${channelItem}[data-selected="true"]`,
    );

    if (selected) {
      selected.setAttribute("data-selected", "false");
    }

    const item = container.querySelector(
      `.${channelItem}[data-channel-id="${channelId}"]`,
    );

    item?.setAttribute("data-selected", "true");
  };

  return {
    updateSelected,
    create,
  };
};

const channelItemHelper = createChannelItemHelper();
