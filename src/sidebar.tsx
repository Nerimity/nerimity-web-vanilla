import style from "./sidebar.module.css";
import { storeEmitter } from "./EventEmitter";
import { h } from "./h";
import { Server, serverStore } from "./store/serverStore";

const createServerItemHelper = () => {
  const create = (server: Server) => (
    <div
      data-server-id={server.id}
      title={server.name}
      class={style.serverItem}
    >
      <img
        loading="lazy"
        src={`https://cdn.nerimity.com/${server.avatar}?size=40`}
        alt={server.name}
      />
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
    containerEl = <div>serverList</div>;
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
