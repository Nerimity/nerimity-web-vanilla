import { css } from "@linaria/core";

import { h } from "../../h";
import { channelStore } from "../../store/channelStore";
import type { Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { convertShorthandToLinearGradient } from "../../utils/color";
import { storeEmitter } from "../../utils/EventEmitter";
import { reconcile } from "../../utils/html";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Markup } from "../markup/markup";

const repliesIndicator = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: var(--radius-10);
  background: var(--gray-900);
  border: solid 1px var(--gray-600);
  margin-top: 4px;
  padding: 2px;
  color: var(--text-color);
  font-size: 14px;
  min-height: 22px;
  max-width: 100%;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;

  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &.hide {
    display: none;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 4px;
    .pill {
      border-radius: var(--radius-max);
      background: var(--gray-800);
      padding: 2px 4px;
      font-size: 10px;
      color: var(--gray-400);
      font-weight: 500;
    }
    .icon {
      color: var(--primary-color);
      font-size: 16px;
      margin-left: 4px;
    }
  }
`;

const messageItem = css`
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 4px;
  padding-right: 2px;
  .content {
    display: flex;
    gap: 4px;
    overflow: hidden;
    margin-right: 2px;
  }

  .username {
    font-weight: 600;
    flex-shrink: 0;
  }
  .message {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .deleteButton {
    padding: 4px;
    margin-left: auto;
    .icon {
      font-size: 12px;
    }
  }
`;

const MessageItem = (props: { message: Message }) => {
  const creator = props.message.createdBy;

  const member = serverMemberStore.serverMembers
    .get(serverStore.currentServerId!)
    ?.get(creator.id);

  const name = member?.nickname || creator.username;

  const topRoleColor = serverStore.memberTopColor(member);

  const color =
    convertShorthandToLinearGradient(topRoleColor) ?? topRoleColor ?? "";

  return (
    <div class={messageItem} data-message-id={props.message.id}>
      <Avatar user={creator} size={14} imgClass="avatar" />
      <div class="content">
        <GradientText class="username" color={color}>
          {name}
        </GradientText>
        <Markup
          class="message"
          text={props.message.content}
          inline
          message={props.message}
          serverId={serverStore.currentServerId}
        />
      </div>
      <Button alert icon="close" class="deleteButton" data-action="delete" />
    </div>
  );
};

export const createRepliesIndicator = (abortController: AbortController) => {
  const { signal } = abortController;
  const listEl = (<div class="list"></div>) as HTMLDivElement;
  const countPill = (<div class="pill"></div>) as HTMLDivElement;
  const el = (
    <div class={[repliesIndicator, "hide"]}>
      {listEl}
      <div class="status">
        <Icon class="icon" name="reply" />
        {countPill}
      </div>
    </div>
  ) as HTMLDivElement;

  const rerender = () => {
    const property = channelStore.currentChannelProperty();
    const replies = property?.replyingMessages;
    el.classList.toggle("hide", !replies?.length);
    if (!replies?.length) {
      listEl.replaceChildren();
      return;
    }

    countPill.innerText = `${replies.length}/5`;

    reconcile({
      container: listEl,
      dataAttr: "message-id",
      values: replies,
      valueId: "id",
      create(item) {
        return <MessageItem message={item} />;
      },
    });
  };

  el.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const deleteButton = target.closest(".deleteButton");
      if (deleteButton) {
        const item = deleteButton.closest(`.${messageItem}`) as HTMLDivElement;
        const messageId = item?.dataset.messageId;
        if (!messageId) return;
        channelStore.removeReply(channelStore.currentChannelId!, messageId);
      }
    },
    { signal },
  );

  storeEmitter.on("message_property:replying", rerender, signal);
  storeEmitter.on("navigate:channelId", rerender, signal);

  signal.addEventListener("abort", () => {});

  return el;
};
