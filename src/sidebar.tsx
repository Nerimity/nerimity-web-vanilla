import style from "./sidebar.module.css";
import { storeEmitter } from "./utils/EventEmitter";
import { h } from "./h";
import { Server, serverStore } from "./store/serverStore";
import { createAvatar } from "./avatar";

const createServerItemHelper = () => {
  const create = (server: Server) => (
    <a
      data-server-id={server.id}
      title={server.name}
      class={style.serverItem}
      data-route
      href={`/app/servers/${server.id}/${server.defaultChannelId}`}
    >
      {createAvatar({ size: 40, server })}
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

const serverItem = createServerItemHelper();

export const createSidebar = () => {
  let containerEl: HTMLElement | null = null;

  const renderList = () => {
    const servers = [...serverStore.servers.values()].map(serverItem.create);
    containerEl!.replaceChildren(...servers);
  };

  const serverUpdateUnsub = storeEmitter.on("server:update", (update) => {
    serverItem.update(containerEl!, update.id);
  });
  const authenticatedUnsub = storeEmitter.on("user:authenticated", () => {
    renderList();
  });

  const render = () => {
    containerEl = (<div class={style.sidebar}></div>) as unknown as HTMLElement;
    renderList();
    return containerEl;
  };

  const destroy = () => {
    serverUpdateUnsub();
    authenticatedUnsub();
    containerEl?.remove();
    containerEl = null;
  };

  return {
    destroy,
    render,
  };
};
