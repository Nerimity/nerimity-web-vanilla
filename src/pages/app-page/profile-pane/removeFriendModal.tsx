import { ph, t } from "@lingui/core/macro";

import { Avatar } from "../../../components/avatar";
import { Button } from "../../../components/button";
import { createModal, Modal } from "../../../components/modal";
import { removeFriend } from "../../../services/friendService";
import { userStore } from "../../../store/userStore";

import style from "./removeFriendModal.module.css";

export const createRemoveFriendModal = (props: { userId: string }) => {
  const user = userStore.users.get(props.userId);
  if (!user) return;

  const abortController = new AbortController();
  const { signal } = abortController;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  requestAnimationFrame(() => {
    body.replaceChildren(
      <div class={style.body}>
        {t`Are you sure you want to unfriend this user?`}
        <div class={style.preview}>
          <Avatar size={32} user={user} />
          <div>{user.username}</div>
        </div>
      </div>,
    );
  });

  const modal = (
    <Modal.Root>
      <Modal.Header
        alert
        label={t`Unfriend ${ph({ username: user.username })}?`}
        icon="heart_broken"
      />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Unfriend`}
          hoverBorder
        />
        <Button
          data-action="request"
          class="button"
          icon="heart_broken"
          label={t`Unfriend`}
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const handleRequest = async (button: HTMLElement) => {
    if (requesting) return;
    const label = button?.querySelector(".label")!;
    requesting = true;
    label.textContent = t`Unfriending...`;

    const [, error] = await removeFriend(props.userId);
    requesting = false;
    label.textContent = t`Unfriend`;
    if (!error) {
      abortController.abort();
    }
  };

  modal.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".button") as HTMLElement | null;
      const action = button?.dataset.action;
      if (action === "request") {
        handleRequest(button!);
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
