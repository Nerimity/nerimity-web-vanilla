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
  }
`;
const MessageItem = (props: { message: Message; prevMessage?: Message }) => {
  const creator = props.message.createdBy;
  const sameCreator = creator.id === props.prevMessage?.createdBy.id;

  const member = serverMemberStore.serverMembers
    .get(serverStore.currentServerId!)
    ?.get(creator.id);

  const topRoleColor = serverStore.memberTopColor(member);
  const color =
    convertShorthandToLinearGradient(topRoleColor) ?? topRoleColor ?? "";

  const name = member?.nickname || creator.username;

  return (
    <div
      class={[messageItem, !sameCreator && "withDetails"]}
      data-message-id={props.message.id}
    >
      {sameCreator ? (
        <div class="avatarPlaceholder"></div>
      ) : (
        <Avatar user={creator} size={40} />
      )}
      <div>
        {!sameCreator && (
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
    });
  };

  const channelIdUnsub = storeEmitter.on("navigate:channelId", () => {
    rerender();
  });

  const messageCreatedUnsub = storeEmitter.on("message:created", (message) => {
    if (message.channelId !== channelStore.currentChannelId) return;
    rerender(true);
  });
  const authUnsub = storeEmitter.on("user:authenticated", () => {
    messageStore
      .loadMessages(channelStore.currentChannelId!)
      .then(() => rerender());
  });

  const render = () => {
    return el;
  };

  const destroy = () => {
    authUnsub();
    channelIdUnsub();
    messageCreatedUnsub();
    el.remove();
  };

  return { render, destroy };
};
