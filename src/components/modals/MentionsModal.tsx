import { t } from "@lingui/core/macro";

import {
  getUserNotifications,
  type RawUserNotification,
} from "../../services/userService";
import { channelStore } from "../../store/channelStore";
import { Message } from "../../store/messageStore";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { getMessageLink } from "../../utils/url";
import { Icon } from "../icon";
import { MessageItem } from "../message-pane/messageItem";
import { Avatar } from "../ui/avatar";
import { Link } from "../ui/link";
import { createModal, Modal } from "../ui/modal";
import { MessageSkeleton, Skeleton } from "../ui/skeleton";

import style from "./MentionsModal.module.css";

const NotificationItem = (props: {
  container: HTMLDivElement;
  noti: RawUserNotification;
  prevNoti?: RawUserNotification;
}) => {
  const message = new Message(props.noti.message);
  const sameChannel = props.prevNoti?.message.channelId === message.channelId;
  const server = props.noti.server;

  const channel = channelStore.channels.get(message.channelId);

  return (
    <>
      {!sameChannel && (
        <div class={style.notificationHeader}>
          <Avatar server={server} size={32} />
          <div class={style.details}>
            <div class={style.title}>{props.noti.server.name}</div>
            <div class={style.subtitle}>#{channel?.name}</div>
          </div>
        </div>
      )}
      <Link
        data-action="open-mention-notification"
        href={getMessageLink({
          channelId: message.channelId,
          messageId: message.id,
          serverId: server.id,
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
    </>
  );
};

export const createMentionsModal = (opts: {
  pos: { x: number; y: number };
}) => {
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
    <Modal.Body width="500px" class={style.body}>
      {Array.from({ length: 6 }, () => (
        <>
          <div class={style.notificationHeader}>
            <Skeleton class={style.avatarSkeleton} />
            <div class={style.details}>
              <Skeleton class={style.titleSkeleton} />
              <Skeleton class={style.subtitleSkeleton} />
            </div>
          </div>
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
    const [notifications] = await getUserNotifications();
    if (!notifications) return;
    if (signal.aborted) return;

    if (!notifications.length) {
      modalBody.replaceChildren(
        <div class={style.noItems}>
          <Icon name="push_pin" class={style.icon} />
          <div>{t`No mentions`}</div>
        </div>,
      );
      return;
    }

    modalBody.replaceChildren(
      <>
        {notifications.map((noti, i) => (
          <NotificationItem
            prevNoti={notifications[i - 1]}
            container={modalBody}
            noti={noti}
          />
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
