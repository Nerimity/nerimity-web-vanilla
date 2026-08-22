import morphdom from "morphdom";

import {
  addReaction,
  reactedUsers,
  removeReaction,
} from "../../services/messageService";
import { channelStore } from "../../store/channelStore";
import {
  Message,
  MessageReaction,
  messageStore,
} from "../../store/messageStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { HoverHandler } from "../../utils/HoverHandler";
import { portalElement } from "../../utils/portal";
import { Avatar } from "../avatar";
import { CdnIcon } from "../cdnIcon";
import { ExpressionPickerLazy } from "../ExpressionPickerLazy";
import { Icon } from "../icon";

import style from "./MessageReactions.module.css";

let popupAbortController: AbortController | undefined = undefined;
const ReactionPopup = (props: {
  target: HTMLDivElement;
  messageId: string;
}) => {
  popupAbortController?.abort();
  const controller = new AbortController();
  popupAbortController = controller;
  const rect = props.target.getBoundingClientRect();

  const el = (
    <div class={style.reactionPopup} style={{ display: "none" }}></div>
  ) as HTMLDivElement;

  const emojiId = props.target.dataset.reactionId;
  const emojiName = props.target.dataset.reactionName!;
  const count = parseInt(props.target.dataset.count!);

  setTimeout(() => {
    if (controller?.signal.aborted) return;

    reactedUsers({
      messageId: props.messageId,
      channelId: channelStore.currentChannelId!,
      limit: 5,
      emojiId,
      name: emojiName,
    }).then(([reacted]) => {
      if (controller?.signal.aborted) return;
      const moreCount = count - 5;
      el.replaceChildren(
        <>
          {reacted?.map((r) => (
            <div class={style.reactUserItem}>
              <Avatar user={r.user} size={18} />
              {r.user.username}
            </div>
          ))}
          {moreCount > 0 && <div class={style.more}>+ {moreCount}</div>}
        </>,
      );
      el.style.display = "flex";
      const elRect = el.getBoundingClientRect();
      const margin = 8;

      let top = rect.top - elRect.height - 4;
      if (top < margin) {
        top = rect.bottom + 4;
      }

      const pillCenter = rect.left + rect.width / 2;
      let left = pillCenter - elRect.width / 2;

      const maxLeft = window.innerWidth - elRect.width - margin;
      left = Math.min(left, maxLeft);
      left = Math.max(left, margin);

      el.style.top = top + "px";
      el.style.left = left + "px";
    });
  }, 500);

  return el;
};

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

  const hoverHandler = new HoverHandler(opts.logs, [
    {
      selector: ".reactionItem",
      onHover(e) {
        const messageEl = e.closest(`[data-message-id]`) as HTMLElement;
        const messageId = messageEl?.dataset.messageId!;
        if (!messageId) return;

        const emojiId = e.dataset.reactionId;
        const emojiName = e.dataset.reactionName!;
        if (!emojiId && !emojiName) return;

        portalElement().appendChild(
          <ReactionPopup target={e as HTMLDivElement} messageId={messageId} />,
        );
      },
      onBlur() {
        portalElement().querySelector(`.${style.reactionPopup}`)?.remove();
        popupAbortController?.abort();
      },
    },
  ]);

  const reactionItemFocusAnimator = new FocusAnimator(
    opts.logs,
    ".reactionItem img",
  );
  opts.logs.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const messageEl = target.closest(`[data-message-id]`) as HTMLElement;
      const messageId = messageEl?.dataset.messageId!;
      if (!messageId) return;
      const reactionEl = target.closest(
        `.${style.messageReactions} .reactionItem`,
      ) as HTMLElement | null;

      const messages = messageStore.messages.get(
        channelStore.currentChannelId!,
      );
      const message = messages?.find((m) => m.id === messageId);
      if (!message) return;

      if (reactionEl?.dataset.addReaction) {
        ExpressionPickerLazy({
          tabs: [],
          onEmojiPick(emoji, custom) {
            addReaction(
              message?.channelId!,
              message?.id!,
              emoji
                ? { name: emoji.emoji, emojiId: null }
                : {
                    emojiId: custom?.id,
                    name: custom?.name,
                    webp: custom?.webp,
                    gif: custom?.gif,
                  },
            );
          },
          targetEl: reactionEl,
        });
      }

      const id =
        reactionEl?.dataset.reactionId || reactionEl?.dataset.reactionName;
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
        isUnicode
          ? { name: id, emojiId: null }
          : { emojiId: id, name: reaction?.name },
      );
    },
    { signal: opts.signal },
  );

  opts.signal.addEventListener(
    "abort",
    () => {
      popupAbortController?.abort();
      hoverHandler.destroy();
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
    `[data-message-id="${message.id}"] .${style.messageReactions}`,
  );
  if (!reactionsEl) return;

  reactionsEl.classList.toggle(style.hide!, !message.reactions?.length);

  let reactionEl = reactionsEl.querySelector(
    `[data-reaction-id="${reaction.emojiId}"]`,
  );
  if (!reactionEl) {
    reactionEl = reactionsEl.querySelector(
      `[data-reaction-name="${reaction.name}"]`,
    );
  }

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
    <div
      class={[
        style.messageReactions,
        !props.message.reactions?.length && style.hide,
      ]}
    >
      {props.message.reactions?.map((reaction) => (
        <ReactionItem reaction={reaction} />
      ))}
      <div data-add-reaction class={[style.reactionItem, "reactionItem"]}>
        <Icon name="add_reaction" class={style.addIcon} />
      </div>
    </div>
  );
};

const ReactionItem = (props: { reaction: MessageReaction }) => {
  return (
    <div
      class={[style.reactionItem, "reactionItem"]}
      data-reaction-id={props.reaction.emojiId}
      data-reaction-name={props.reaction.name}
      data-reacted={props.reaction.reacted}
      data-count={props.reaction.count}
      data-uni={!props.reaction.emojiId}
    >
      <CdnIcon
        animate={document.hasFocus()}
        class={style.icon}
        reaction={props.reaction}
        size={16}
      />
      <div class="count">{props.reaction.count}</div>
    </div>
  );
};
