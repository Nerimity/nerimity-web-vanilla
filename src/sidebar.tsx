import style from "./sidebar.module.css";
import { storeEmitter } from "./utils/EventEmitter";
import { h } from "./h";
import { Server, serverStore } from "./store/serverStore";
import { createAvatar } from "./avatar";

const createServerItemHelper = () => {
  const create = (server: Server) => (
    <div
      data-server-id={server.id}
      title={server.name}
      class={style.serverItem}
    >
      {createAvatar({ size: 40, server })}
    </div>
  );

  const update = (containerEl: JSX.Element, id: string) => {
    const server = serverStore.servers.get(id)!;
    containerEl
      .querySelector(`[data-server-id="${id}"]`)!
      .replaceWith(serverItem.create(server));
  };

  return {
    create,
    update,
  };
};

const serverItem = createServerItemHelper();

const createSidebar = () => {
  let containerEl: JSX.Element;
  const serverUpdateUnsub = storeEmitter.on("server:update", (update) => {
    serverItem.update(containerEl, update.id);
  });
  const authenticatedUnsub = storeEmitter.on("user:authenticated", () => {
    const servers = [...serverStore.servers.values()].map(serverItem.create);
    containerEl.replaceChildren(...servers);
  });

  const render = () => {
    containerEl = <div class={style.sidebar}></div>;
    return containerEl;
  };

  const destroy = () => {
    serverUpdateUnsub();
    authenticatedUnsub();
  };

  return {
    destroy,
    render,
  };
};

export const serverSidebar = createSidebar();
