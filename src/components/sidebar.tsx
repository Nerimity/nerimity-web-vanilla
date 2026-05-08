import { storeEmitter } from "../utils/EventEmitter";
import { h } from "../h";
import { Server, serverStore } from "../store/serverStore";
import { Avatar } from "./avatar";
import { reconcile } from "../utils/html";
import { Link } from "./link";
import { Item } from "./item";
import { HoverAnimator } from "../utils/HoverAnimator";
import { css } from "@linaria/core";

const serverItemLink = css`
  overflow: hidden;
  flex-shrink: 0;
  .serverItem {
    padding: 6px 14px;
  }
`;

const createServerItemHelper = () => {
  const create = (server: Server) => (
    <Link
      data-server-id={server.id}
      title={server.name}
      class={serverItemLink}
      href={`/app/servers/${server.id}/${server.defaultChannelId}`}
    >
      <Item.Base
        class="serverItem"
        selected={serverStore.currentServerId === server.id}
      >
        <Avatar size={42} server={server} imgClass="avatar" />
      </Item.Base>
    </Link>
  );

  const updateSelected = (container: HTMLElement, serverId?: string | null) => {
    const selected = container.querySelector(`.item[data-selected="true"]`);

    if (selected) {
      selected.setAttribute("data-selected", "false");
    }

    if (!serverId) return;

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

const sidebar = css`
  display: flex;

  overflow: auto;
  align-items: center;
  flex-direction: column;
  flex-shrink: 0;
  width: 76px;
  height: 100vh;
  gap: 2px;
  &::-webkit-scrollbar {
    display: none;
  }
`;

export const createSidebar = () => {
  let containerEl: HTMLElement | null = null;
  let hoverAnimator: HoverAnimator | null = null;

  const renderList = () => {
    if (!containerEl) return;
    const servers = [...serverStore.servers.values()];
    reconcile({
      container: containerEl,
      dataAttr: "server-id",
      values: servers,
      valueId: "id",
      create: serverItem.create,
    });
  };

  const serverUpdateUnsub = storeEmitter.on("server:update", renderList);
  const authenticatedUnsub = storeEmitter.on("user:authenticated", renderList);
  const serveridUnsub = storeEmitter.on("navigate:serverId", () => {
    if (!containerEl) return;
    serverItem.updateSelected(containerEl, serverStore.currentServerId);
  });

  const render = () => {
    containerEl = (<div class={sidebar}></div>) as unknown as HTMLElement;
    hoverAnimator = new HoverAnimator(containerEl, [
      { trigger: `.${serverItemLink}`, image: "img.avatar" },
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
