import style from "./serverMemberList.module.css";
import { h } from "../h";
import { ServerMember, serverMemberStore } from "../store/serverMemberStore";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { storeEmitter } from "../utils/EventEmitter";
import { reconcile } from "../utils/html";
import { Avatar } from "./avatar";

const memberItem = (member: ServerMember) => {
  const user = userStore.users.get(member.userId);
  return (
    <div class={style.memberItem} data-user-id={member.userId}>
      <Avatar size={32} user={user!} />
      <span>{user?.username}</span>
    </div>
  );
};

export const createServerMemberList = () => {
  let containerEl: HTMLElement | null = null;

  const renderList = () => {
    if (!containerEl) return;

    const members = [
      ...(serverMemberStore.serverMembers
        .get(serverStore.currentServerId!)
        ?.values() || []),
    ];

    reconcile({
      container: containerEl,
      dataAttr: "user-id",
      values: members,
      valueId: "userId",
      chunkSize: 30,
      create: memberItem,
    });
  };

  const channelIdUnsub = storeEmitter.on("navigate:channelId", () => {
    renderList();
  });

  const render = () => {
    containerEl = (
      <div class={style.serverMemberList}></div>
    ) as unknown as HTMLElement;

    renderList();

    return containerEl;
  };

  const destroy = () => {
    channelIdUnsub();
    containerEl?.remove();
    containerEl = null;
  };

  return {
    destroy,
    render,
  };
};
