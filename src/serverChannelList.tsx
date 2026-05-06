import style from "./serverChannelList.module.css";
import { storeEmitter } from "./utils/EventEmitter";
import { h } from "./h";
import { serverStore } from "./store/serverStore";
import { channelStore, type Channel } from "./store/channelStore";

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

  const update = (containerEl: JSX.Element, id: string) => {
    const server = serverStore.servers.get(id)!;
    containerEl
      .querySelector(`[data-server-id="${id}"]`)!
      .replaceWith(create(server));
  };

  return {
    create,
    update,
  };
};

const channelItem = createChannelItemHelper();

export const createServerChannelList = () => {
  let containerEl: HTMLElement | null = null;

  const renderList = () => {
    const currentServerId = serverStore.currentServerId;
    console.log(currentServerId);
    if (!currentServerId) {
      containerEl!.replaceChildren();
      return;
    }
    const serverChannels = [...channelStore.channels.values()].filter(
      (channel) => {
        return channel.serverId === serverStore.currentServerId;
      },
    );
    containerEl!.replaceChildren(...serverChannels.map(channelItem.create));
  };

  const navServerIdUnsub = storeEmitter.on("navigate:serverId", () => {
    renderList();
  });

  const authenticatedUnsub = storeEmitter.on("user:authenticated", () => {
    renderList();
  });

  const render = () => {
    containerEl = (
      <div class={style.serverChannelList}></div>
    ) as unknown as HTMLElement;
    renderList();
    return containerEl;
  };

  const destroy = () => {
    navServerIdUnsub();
    authenticatedUnsub();
    containerEl?.remove();
    containerEl = null;
  };

  return {
    destroy,
    render,
  };
};
