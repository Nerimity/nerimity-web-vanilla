import morphdom from "morphdom";

import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { messageStore } from "../../store/messageStore";
import { MessageType } from "../../Types";
import { friendlyTimestamp } from "../../utils/date";
import { Button } from "../button";
import { createDeleteMessageModal } from "./deleteMessageModal";

import style from "./messageHoverActions.module.css";

const HoverActions = (props: {
  messageId?: string;
  messageElement?: HTMLDivElement | null;
}) => {
  const channelId = channelStore.currentChannelId;
  const messages = messageStore.messages.get(channelId!);
  const message = messages?.findLast((m) => m.id === props.messageId!);
  const grouped = props.messageElement?.dataset.grouped;

  const createdBySelf = message?.createdBy.id === accountStore.currentUser?.id;

  const canEdit = () => {
    if (!createdBySelf) return false;
    if (message?.type !== MessageType.CONTENT) return false;
    return !message.state;
  };

  return (
    <div class={[style.hoverActionContainer, style.hide]}>
      {grouped && (
        <span class={style.timestamp}>
          {friendlyTimestamp(message?.createdAt!)}
        </span>
      )}
      <Button
        class={style.button}
        data-action="reply"
        icon="reply"
        hoverBorder
      />
      {canEdit() && (
        <Button
          class={style.button}
          data-action="edit"
          icon="edit"
          hoverBorder
        />
      )}
      <Button
        class={style.button}
        data-action="delete"
        icon="delete"
        alert
        hoverBorder
      />
    </div>
  );
};

export const createMessageHoverActions = (opts: {
  container: HTMLDivElement;
  signal: AbortSignal;
}) => {
  let hoveredMessageItem: HTMLDivElement | null = null;

  let hoverActionEl = (<HoverActions />) as HTMLDivElement;

  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

  const messageHovered = (messageEl: HTMLDivElement) => {
    messageEl.classList.add("force-hover");

    const parentElement = messageEl.parentElement as HTMLDivElement | null;

    const messageId = parentElement?.dataset.messageId;
    morphdom(
      hoverActionEl,
      <HoverActions messageId={messageId} messageElement={parentElement} />,
    );
    hoverActionEl.classList.toggle(style.hide!, false);

    hoverActionEl.style.top = `${messageEl.offsetTop - 20}px`;
  };
  const messageUnhovered = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    hoveredMessageItem?.classList.remove("force-hover");
    hoverActionEl.classList.toggle(style.hide!, true);
  };

  const getMessage = () => {
    const messageId = hoveredMessageItem?.parentElement?.dataset.messageId;
    const messages = messageStore.messages.get(channelStore.currentChannelId!);
    return messages?.findLast((m) => m.id === messageId);
  };

  const handleDeleteMessage = (skipConfirmation?: boolean) => {
    const message = getMessage();
    if (!message) return;

    createDeleteMessageModal({ message, skipConfirmation });
  };

  const handleEditMessage = () => {
    const message = getMessage();
    if (!message) return;
    channelStore.setEditingMessage(channelStore.currentChannelId!, message);
  };

  const handleReplyMessage = () => {
    const message = getMessage();
    if (!message) return;
    channelStore.addReply(channelStore.currentChannelId!, message);
  };

  hoverActionEl.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest(`.${style.button}`) as HTMLElement | null;
      const action = button?.dataset.action;
      if (action === "delete") {
        handleDeleteMessage(e.shiftKey);
      }
      if (action === "edit") {
        handleEditMessage();
      }
      if (action === "reply") {
        handleReplyMessage();
      }
    },
    { signal: opts.signal },
  );

  opts.container.addEventListener(
    "mouseover",
    (e) => {
      const target = e.target as HTMLElement;
      if (hoverActionEl.contains(target)) return;

      const messageItem = target.closest<HTMLDivElement>(".messageItem");

      if (messageItem === hoveredMessageItem) return;

      if (hoveredMessageItem) {
        messageUnhovered();
      }

      hoveredMessageItem = messageItem;

      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }

      if (hoveredMessageItem) {
        hoverTimeout = setTimeout(() => {
          if (hoveredMessageItem) {
            messageHovered(hoveredMessageItem);
          }
          hoverTimeout = null;
        }, 0);
      }
    },
    { signal: opts.signal },
  );

  opts.container.addEventListener(
    "mouseout",
    (e) => {
      const related = e.relatedTarget as HTMLElement | null;

      if (
        !opts.container.contains(related) &&
        !hoverActionEl.contains(related)
      ) {
        if (hoveredMessageItem) {
          messageUnhovered();
          hoveredMessageItem = null;
        }
      }
    },
    { signal: opts.signal },
  );

  hoverActionEl.addEventListener(
    "mouseout",
    (e) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (
        !hoverActionEl.contains(related) &&
        !opts.container.contains(related)
      ) {
        if (hoveredMessageItem) {
          messageUnhovered();
          hoveredMessageItem = null;
        }
      }
    },
    { signal: opts.signal },
  );

  opts.signal.addEventListener(
    "abort",
    () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      hoverActionEl.remove();
      (hoverActionEl as any) = null;
      hoveredMessageItem = null;
    },
    { once: true },
  );
  return {
    get hoverActionEl() {
      return hoverActionEl;
    },
  };
};
