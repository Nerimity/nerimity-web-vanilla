import { css } from "@linaria/core";
import { h } from "../h";
import { channelStore } from "../store/channelStore";
import { Message, messageStore } from "../store/messageStore";
import { storeEmitter } from "../utils/EventEmitter";
import { reconcile } from "../utils/html";
import { Avatar } from "./avatar";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverStore } from "../store/serverStore";
import { GradientText } from "./gradientText";
import { convertShorthandToLinearGradient } from "../utils/color";
import { ServerClanItem } from "./serverClanItem";
import { accountStore } from "../store/accountStore";
import morphdom from "morphdom";

const shouldGroup = (message: Message, prev?: Message): boolean => {
  if (!prev) return false;
  if (message.createdBy.id !== prev.createdBy.id) return false;
  const diff = message.createdAt - prev.createdAt;
  if (diff > 5 * 60 * 1000) return false;
  return true;
};

const messageItem = css`
  display: flex;
  gap: 10px;
  padding-left: 4px;
  padding-right: 4px;
  &:hover {
    background-color: var(--slate-800);
  }

  .details {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  &.withDetails {
    margin-top: 10px;
  }
  .username {
    font-weight: 500;
  }
  .avatarPlaceholder {
    width: 40px;
    height: 1px;
  }
  .content {
    white-space: pre-wrap;
    word-break: break-word;
  }
`;
const MessageItem = (props: { message: Message; prevMessage?: Message }) => {
  const creator = props.message.createdBy;
  const group =
    props.prevMessage && shouldGroup(props.message, props.prevMessage);

  const member = serverMemberStore.serverMembers
    .get(serverStore.currentServerId!)
    ?.get(creator.id);

  const topRoleColor = serverStore.memberTopColor(member);
  const color =
    convertShorthandToLinearGradient(topRoleColor) ?? topRoleColor ?? "";

  const name = member?.nickname || creator.username;

  return (
    <div
      class={[messageItem, !group && "withDetails"]}
      data-message-id={props.message.id}
      data-grouped={group}
    >
      {group ? (
        <div class="avatarPlaceholder"></div>
      ) : (
        <Avatar user={creator} size={40} />
      )}
      <div>
        {!group && (
          <span class="details">
            <GradientText class="username" color={color}>
              {name}
            </GradientText>
            {creator?.profile?.clan && (
              <ServerClanItem clan={creator.profile.clan} />
            )}
          </span>
        )}
        <div class="content">{props.message.content}</div>
      </div>
    </div>
  );
};

const messagePane = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100vh;
  overflow: auto;
  width: 100%;
`;
export const createMessagePane = () => {
  const el = (<div class={messagePane}></div>) as unknown as HTMLDivElement;

  const updateMessage = (message: Message, index: number) => {
    const messages = messageStore.messages.get(channelStore.currentChannelId!);
    const messageEl = el.querySelector(
      `[data-message-id="${message.id}"]`,
    ) as HTMLDivElement | null;
    if (!messageEl) return;
    morphdom(
      messageEl,
      (
        <MessageItem message={message} prevMessage={messages?.[index - 1]} />
      ) as unknown as HTMLElement,
    );
  };

  const rerender = async (loadFromCache?: boolean) => {
    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    const messages = loadFromCache
      ? messageStore.messages.get(channelId)
      : await messageStore.loadMessages(channelStore.currentChannelId!);
    if (!messages) return;
    if (channelId !== channelStore.currentChannelId) return;

    reconcile({
      container: el,
      dataAttr: "message-id",
      values: messages,
      valueId: "id",
      create: (m, i) => (
        <MessageItem message={m} prevMessage={messages[i - 1]} />
      ),
      shouldRecreate: (node, m, i) => {
        const prevGrouped = node.dataset.grouped === "true";
        const nextGrouped = shouldGroup(m, messages[i - 1]);
        return prevGrouped !== nextGrouped;
      },
    });
  };

  const channelIdUnsub = storeEmitter.on("navigate:channelId", () => {
    rerender();
  });

  const messageCreatedUnsub = storeEmitter.on("message:created", (message) => {
    if (message.channelId !== channelStore.currentChannelId) return;
    rerender(true);
  });
  const messageDeletedUnsub = storeEmitter.on("message:deleted", (event) => {
    if (event.channelId !== channelStore.currentChannelId) return;
    rerender(true);
  });
  const authUnsub = storeEmitter.on("user:authenticated", () => {
    messageStore
      .loadMessages(channelStore.currentChannelId!)
      .then(() => rerender());
  });

  const messageUpdatedUnsub = storeEmitter.on(
    "message:updated",
    ({ message, index }) => {
      if (message.channelId !== channelStore.currentChannelId) return;
      updateMessage(message, index);
    },
  );

  const render = () => {
    if (accountStore.authenticated) {
      messageStore
        .loadMessages(channelStore.currentChannelId!)
        .then(() => rerender());
    }
    return el;
  };

  const destroy = () => {
    authUnsub();
    channelIdUnsub();
    messageCreatedUnsub();
    messageDeletedUnsub();
    messageUpdatedUnsub();
    el.remove();
  };

  return { render, destroy };
};
