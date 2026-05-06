import style from "./sidebar.module.css";
import { storeEmitter } from "../utils/EventEmitter";
import { h } from "../h";
import { Server, serverStore } from "../store/serverStore";
import { Avatar } from "./avatar";
import { reconcile } from "../utils/html";
import { Link } from "./link";
import { Item } from "./item";
import { HoverAnimator } from "../utils/HoverAnimator";

const createServerItemHelper = () => {
  const create = (server: Server) => (
    <Link
      data-server-id={server.id}
      title={server.name}
      class={style.serverItemLink}
      href={`/app/servers/${server.id}/${server.defaultChannelId}`}
    >
      <Item.Base
        class={style.serverItem}
        selected={serverStore.currentServerId === server.id}
      >
        <Avatar size={42} server={server} imgClass="avatar" />
      </Item.Base>
    </Link>
  );

  const updateSelected = (container: HTMLElement, serverId: string) => {
    const selected = container.querySelector(`.item[data-selected="true"]`);

    if (selected) {
      selected.setAttribute("data-selected", "false");
    }

    const item = container.querySelector(
      `[data-server-id="${serverId}"] .item`,
    );
    item?.setAttribute("data-selected", "true");
  };

  return {
    create,
    updateSelected,
  };
};

const serverItem = createServerItemHelper();

export const createSidebar = () => {
  let containerEl: HTMLElement | null = null;

  const renderList = () => {
    const servers = [...serverStore.servers.values()];
    reconcile({
      container: containerEl!,
      dataAttr: "server-id",
      values: servers,
      create: serverItem.create,
    });
  };

  const serverUpdateUnsub = storeEmitter.on("server:update", () => {
    renderList();
  });
  const authenticatedUnsub = storeEmitter.on("user:authenticated", () => {
    renderList();
  });
  const serveridUnsub = storeEmitter.on("navigate:serverId", () => {
    serverItem.updateSelected(containerEl!, serverStore.currentServerId!);
  });

  let hoverAnimator: HoverAnimator | null = null;

  const render = () => {
    containerEl = (<div class={style.sidebar}></div>) as unknown as HTMLElement;
    hoverAnimator = new HoverAnimator(containerEl, [
      { trigger: `.${style.serverItemLink}`, avatar: "img.avatar" },
    ]);
    renderList();
    return containerEl;
  };

  const destroy = () => {
    hoverAnimator?.destroy();
    serverUpdateUnsub();
    authenticatedUnsub();
    serveridUnsub();
    containerEl?.remove();
    containerEl = null;
    hoverAnimator = null;
  };

  return {
    destroy,
    render,
  };
};
