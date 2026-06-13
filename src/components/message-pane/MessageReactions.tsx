import { css } from "@linaria/core";
import morphdom from "morphdom";

import { h } from "../../h";
import { addReaction, removeReaction } from "../../services/messageService";
import { channelStore } from "../../store/channelStore";
import {
  Message,
  MessageReaction,
  messageStore,
} from "../../store/messageStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { CdnIcon } from "../cdnIcon";

const messageReactions = css`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  user-select: none;
  margin-top: 4px;
  &.hide {
    display: none;
  }
`;

export const createMessageReactionHandler = (opts: {
  signal: AbortSignal;
  logs: HTMLDivElement;
}) => {
  storeEmitter.on(
    "message:reaction_updated",
    (event) => {
      if (event.message.channelId !== channelStore.currentChannelId) return;
      updateMessageReaction(opts.logs, event.reaction, event.message);
    },
    opts.signal,
  );

  const reactionItemFocusAnimator = new FocusAnimator(
    opts.logs,
    ".reactionItem img",
  );
  opts.logs.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const messageEl = target.closest(`[data-message-id]`) as HTMLElement;
      const messageId = messageEl.dataset.messageId!;
      if (!messageId) return;

      const messages = messageStore.messages.get(
        channelStore.currentChannelId!,
      );
      const message = messages?.find((m) => m.id === messageId);
      if (!message) return;

      const reactionEl = target.closest(
        `.${messageReactions} .reactionItem`,
      ) as HTMLElement | null;

      const id = reactionEl?.dataset.reactionId;
      if (!id) return;

      const isUnicode = reactionEl?.dataset.uni;

      const reaction = message.reactions?.find((r) => {
        if (isUnicode) return r.name === id;
        return r.emojiId === id;
      });
      if (!reaction) return;

      (reaction.reacted ? removeReaction : addReaction)(
        channelStore.currentChannelId!,
        messageId,
        isUnicode ? { name: id } : { emojiId: id, name: reaction?.name },
      );
    },
    { signal: opts.signal },
  );

  opts.signal.addEventListener(
    "abort",
    () => {
      reactionItemFocusAnimator.destroy();
    },
    { once: true },
  );
};

const updateMessageReaction = (
  logs: HTMLDivElement,
  reaction: MessageReaction,
  message: Message,
) => {
  const reactionsEl = logs.querySelector(
    `[data-message-id="${message.id}"] .${messageReactions}`,
  );
  if (!reactionsEl) return;

  reactionsEl.classList.toggle("hide", !message.reactions?.length);

  const id = reaction.emojiId || reaction.name;
  const reactionEl = reactionsEl.querySelector(`[data-reaction-id="${id}"]`);

  if (!reactionEl) {
    if (reaction.count > 0)
      reactionsEl.appendChild(<ReactionItem reaction={reaction} />);
    return;
  }

  if (reaction.count === 0) reactionEl.remove();
  else
    morphdom(
      reactionEl,
      (<ReactionItem reaction={reaction} />) as unknown as HTMLElement,
    );
};

export const MessageReactions = (props: { message: Message }) => {
  return (
    <div class={[messageReactions, !props.message.reactions?.length && "hide"]}>
      {props.message.reactions?.map((reaction) => (
        <ReactionItem reaction={reaction} />
      ))}
    </div>
  );
};

const reactionItem = css`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  padding-right: 8px;
  border-radius: var(--radius-max);
  background-color: var(--gray-800);
  border: solid 1px var(--gray-800);
  font-size: 12px;
  cursor: pointer;
  transition: 0.2s;
  &:hover {
    border: solid 1px var(--primary-color);
  }
  &[data-reacted="true"] {
    border: solid 1px var(--primary-color);
    color: var(--primary-color);
  }
  .icon {
    background-color: transparent;
  }
`;

const ReactionItem = (props: { reaction: MessageReaction }) => {
  const id = props.reaction.emojiId || props.reaction.name;

  return (
    <div
      class={[reactionItem, "reactionItem"]}
      data-reaction-id={id}
      data-reacted={props.reaction.reacted}
      data-uni={!props.reaction.emojiId}
    >
      <CdnIcon
        animate={document.hasFocus()}
        class="icon"
        reaction={props.reaction}
        size={16}
      />
      <div class="count">{props.reaction.count}</div>
    </div>
  );
};
