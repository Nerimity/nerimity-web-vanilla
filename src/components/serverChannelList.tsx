import style from "./serverChannelList.module.css";
import { storeEmitter } from "../utils/EventEmitter";
import { h } from "../h";
import { serverStore } from "../store/serverStore";
import { channelStore, type Channel } from "../store/channelStore";
import { reconcile } from "../utils/html";

const createChannelItemHelper = () => {
  const create = (channel: Channel) => (
    <a
      data-channel-id={channel.id}
      title={channel.name}
      data-route
      href={`/app/servers/${channel.serverId}/${channel.id}`}
    >
      {channel.name}
    </a>
  );

  return {
    create,
  };
};

const channelItem = createChannelItemHelper();

export const createServerChannelList = () => {
  let containerEl: HTMLElement | null = null;

  const renderList = () => {
    const serverChannels = serverStore.currentChannels.value() || [];

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

  const channelListUnsub = serverStore.currentChannels.onUpdate(renderList);

  const render = () => {
    containerEl = (
      <div class={style.serverChannelList}></div>
    ) as unknown as HTMLElement;
    renderList();
    return containerEl;
  };

  const destroy = () => {
    channelListUnsub();
    containerEl?.remove();
    containerEl = null;
  };

  return {
    destroy,
    render,
  };
};
