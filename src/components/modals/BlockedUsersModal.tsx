import { ph, t } from "@lingui/core/macro";

import { friendStore } from "../../store/friendStore";
import { FriendStatus } from "../../Types";
import { formatTimestamp } from "../../utils/date";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Link } from "../ui/link";
import { createModal, Modal } from "../ui/modal";

import style from "./BlockedUsersModal.module.css";

export const createBlockedUsersModal = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const body = (<Modal.Body width="460px"></Modal.Body>) as HTMLDivElement;

  const rerender = () => {
    const blockedFriend = [...friendStore.friends.values()]
      .filter((f) => f.status === FriendStatus.BLOCKED)
      .sort((a, b) => b.createdAt - a.createdAt);
    body.replaceChildren(
      <div class={style.items}>
        {blockedFriend.map((friend) => (
          <Link
            href={`/app/profile/${friend.user?.id}`}
            data-user-id={friend.user?.id}
            class={style.userItem}
          >
            <Avatar user={friend.user} size={32} />
            <div class={style.userInfo}>
              <div>{friend.user?.username}</div>
              <div class={style.blockedAt}>{t`Blocked at ${ph({
                date: formatTimestamp(friend.createdAt),
              })}`}</div>
            </div>
            <Button alert data-action="unblock" icon="close" />
          </Link>
        ))}
      </div>,
    );
  };
  rerender();
  storeEmitter.on(
    "ws:authStateUpdate",
    (s) => {
      if (!s) return;
      rerender();
    },
    signal,
  );

  const modal = (
    <Modal.Root>
      <Modal.Header alert label={t`Blocked Users`} icon="person_off" />
      {body}
    </Modal.Root>
  ) as HTMLDivElement;

  modal.addEventListener(
    "click",
    async (e) => {
      const button = closestFromEvent(e, ".button");
      const action = button?.dataset.action;
      if (action === "ban") {
        return;
      }
      if (action === "close") {
        abortController.abort();
      }
    },
    { signal },
  );

  createModal(() => {
    return modal;
  }, abortController);
};
