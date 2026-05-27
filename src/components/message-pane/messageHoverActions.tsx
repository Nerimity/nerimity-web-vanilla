import { css } from "@linaria/core";
import morphdom from "morphdom";

import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { messageStore } from "../../store/messageStore";
import { friendlyTimestamp } from "../../utils/date";
import { Button } from "../button";

const hoverActionContainer = css`
  display: flex;
  gap: 2px;
  align-items: center;
  justify-content: center;
  position: absolute;
  background: var(--gray-800);
  border: solid 1px var(--gray-700);
  height: 34px;
  z-index: 999999999;
  border-radius: var(--radius-max);
  padding-right: 2px;
  padding-left: 2px;
  right: 10px;

  &.hide {
    display: none;
  }
  .timestamp {
    margin-left: 8px;
    margin-right: 4px;
    color: var(--gray-400);
    font-size: 12px;
  }
  .button {
    border: none;
    border-radius: var(--radius-max);
    flex-shrink: 0;
    padding: 5px;
    > .icon {
      font-size: 18px;
    }
  }
`;

const HoverActions = (props: {
  messageId?: string;
  messageElement?: HTMLDivElement | null;
}) => {
  const channelId = channelStore.currentChannelId;
  const messages = messageStore.messages.get(channelId!);
  const message = messages?.findLast((m) => m.id === props.messageId!);
  const grouped = props.messageElement?.dataset.grouped;

  const createdBySelf = message?.createdBy.id === accountStore.currentUser?.id;

  return (
    <div class={[hoverActionContainer, "hide"]}>
      {grouped && (
        <span class="timestamp">{friendlyTimestamp(message?.createdAt!)}</span>
      )}
      {createdBySelf && <Button class="button" icon="edit" hoverBorder />}
      <Button class="button" icon="delete" alert hoverBorder />
    </div>
  );
};

export const createMessageHoverActions = (opts: {
  container: HTMLDivElement;
  signal: AbortSignal;
}) => {
  let hoveredMessageItem: HTMLDivElement | null = null;

  const hoverActionEl = (<HoverActions />) as HTMLDivElement;

  const messageHovered = (messageEl: HTMLDivElement) => {
    messageEl.classList.add("force-hover");

    const parentElement = messageEl.parentElement as HTMLDivElement | null;

    const messageId = parentElement?.dataset.messageId;
    morphdom(
      hoverActionEl,
      <HoverActions messageId={messageId} messageElement={parentElement} />,
    );
    hoverActionEl.classList.toggle("hide", false);

    hoverActionEl.style.top = `${messageEl.offsetTop - 20}px`;
  };
  const messageUnhovered = () => {
    hoveredMessageItem?.classList.remove("force-hover");
    hoverActionEl.classList.toggle("hide", true);
  };

  opts.container.addEventListener(
    "mouseover",
    (e) => {
      const target = e.target as HTMLElement;
      if (hoverActionEl.contains(target)) return;

      const messageItem = target.closest<HTMLDivElement>(".messageItem");

      if (messageItem === hoveredMessageItem) {
        return;
      }

      if (hoveredMessageItem) {
        messageUnhovered();
      }

      hoveredMessageItem = messageItem;

      if (hoveredMessageItem) {
        messageHovered(hoveredMessageItem);
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
      hoverActionEl.remove();
    },
    { once: true },
  );
  return { hoverActionEl };
};
