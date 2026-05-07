import style from "./serverChannelList.module.css";
import { h, Fragment } from "../h";
import { serverStore } from "../store/serverStore";
import { channelStore, type Channel } from "../store/channelStore";
import { reconcile } from "../utils/html";
import { Item } from "./item";
import { Link } from "./link";
import { storeEmitter } from "../utils/EventEmitter";
import { ChannelIcon } from "./channelIcon";
import { HoverAnimator } from "../utils/HoverAnimator";
import { ChannelType } from "../Types";

const createChannelItemHelper = () => {
  const create = (channel: Channel) => {
    const isCategory = channel.type === ChannelType.CATEGORY;
    return (
      <Link
        data-channel-id={channel.id}
        title={channel.name}
        data-route
        class={["channelItemLink", isCategory && style.categoryLink]}
        href={`/app/servers/${channel.serverId}/${channel.id}`}
      >
        <Item.Base
          class={style.channelItem}
          selected={channelStore.currentChannelId === channel.id}
        >
          <>
            <ChannelIcon
              class="channelIcon"
              size={isCategory ? 10 : 18}
              channel={channel}
            />
            <Item.Label
              class={[isCategory && style.categoryLabel]}
              size={isCategory ? 12 : 16}
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

const channelItem = createChannelItemHelper();

export const createServerChannelList = () => {
  let containerEl: HTMLElement | null = null;
  let hoverAnimator: HoverAnimator | null = null;

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
      create: channelItem.create,
    });
  };

  const channelListUnsub =
    serverStore.currentChannelsSorted.onUpdate(renderList);

  const channelIdUnsub = storeEmitter.on("navigate:channelId", () => {
    channelItem.updateSelected(containerEl!, channelStore.currentChannelId!);
  });

  const render = () => {
    containerEl = (
      <div class={style.serverChannelList}></div>
    ) as unknown as HTMLElement;
    hoverAnimator = new HoverAnimator(containerEl, [
      { trigger: `.channelItemLink`, image: ".channelIcon img" },
    ]);
    renderList();

    return containerEl;
  };

  const destroy = () => {
    hoverAnimator?.destroy();
    channelListUnsub();
    channelIdUnsub();
    containerEl?.remove();
    containerEl = null;
  };

  return {
    destroy,
    render,
  };
};
