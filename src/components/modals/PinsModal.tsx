import { t } from "@lingui/core/macro";

import { pinnedMessages } from "../../services/messageService";
import { channelStore } from "../../store/channelStore";
import { Message } from "../../store/messageStore";
import type { RawMessage } from "../../Types";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { getMessageLink } from "../../utils/url";
import { Icon } from "../icon";
import { MessageItem } from "../message-pane/messageItem";
import { Link } from "../ui/link";
import { createModal, Modal } from "../ui/modal";
import { MessageSkeleton } from "../ui/skeleton";

import style from "./MentionsModal.module.css";

const NotificationItem = (props: {
  container: HTMLDivElement;
  message: RawMessage;
}) => {
  const message = new Message(props.message);

  const channel = channelStore.channels.get(message.channelId);

  return (
    <Link
      data-action="open-mention-notification"
      href={getMessageLink({
        channelId: message.channelId,
        messageId: message.id,
        serverId: channel?.serverId,
      })}
      class={style.notificationItem}
    >
      <MessageItem
        container={props.container}
        message={message}
        grouped={false}
        hideNewDayMarker
      />
    </Link>
  );
};

export const createPinsModal = (opts: { pos: { x: number; y: number } }) => {
  const ac = new AbortController();
  const { signal } = ac;

  storeEmitter.on(
    "drawer:modeChange",
    () => {
      ac.abort();
    },
    signal,
  );

  const modalBody = (
    <Modal.Body width="500px" class={[style.body, style.pinsBody]}>
      {Array.from({ length: 6 }, () => (
        <>
          <MessageSkeleton />
        </>
      ))}
    </Modal.Body>
  ) as HTMLDivElement;

  modalBody.addEventListener("click", (e) => {
    const actionEl = closestFromEvent(e, "[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action!;
    if (action === "open-mention-notification") {
      ac.abort();
    }
  });

  const fetchNotifications = async () => {
    const channelId = channelStore.currentChannelId!;
    const [res] = await pinnedMessages(channelId);
    if (!res?.messages) return;
    if (signal.aborted) return;
    const messages = res.messages;

    if (!res.messages.length) {
      modalBody.replaceChildren(
        <div class={style.noItems}>
          <Icon name="push_pin" class={style.icon} />
          <div>{t`No pinned messages`}</div>
        </div>,
      );
      return;
    }

    modalBody.replaceChildren(
      <>
        {messages.map((message) => (
          <NotificationItem container={modalBody} message={message} />
        ))}
      </>,
    );
  };

  fetchNotifications();

  createModal(
    () => (
      <Modal.Root
        pos={{
          x: opts.pos.x + "px",
          y: opts.pos.y + "px",
        }}
      >
        {modalBody}
      </Modal.Root>
    ),
    ac,
  );
};
