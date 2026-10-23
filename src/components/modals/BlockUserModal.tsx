import { t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { blockUser } from "../../services/userService";
import { userStore } from "../../store/userStore";
import { closestFromEvent } from "../../utils/dom";
import { Button } from "../ui/button";
import { createModal, Modal } from "../ui/modal";

import style from "./BlockUserModal.module.css";

export const createBlockUserModal = (props: {
  userId: string;
  username?: string;
}) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const user = userStore.users.get(props.userId)!;
  const username = props.username || user.username;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  requestAnimationFrame(() => {
    body.replaceChildren(
      <div class={style.body}>
        <span class={style.message}>
          <Trans>
            Are you sure you want to block{" "}
            <span class={style.username}>{username}</span>
          </Trans>
        </span>
      </div>,
    );
  });

  const modal = (
    <Modal.Root>
      <Modal.Header alert label={t`Block ${username}`} icon="logout" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Block`}
          hoverBorder
        />
        <Button
          data-action="block"
          class="button"
          icon="logout"
          label={t`Block`}
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const handleBlock = async (button: HTMLElement) => {
    if (requesting) return;
    const label = button?.querySelector(".label")!;
    requesting = true;
    label.textContent = t`Blocking...`;

    const [, error] = await blockUser(props.userId);
    requesting = false;
    label.textContent = t`Block`;
    if (!error) {
      abortController.abort();
    }
  };

  modal.addEventListener(
    "click",
    async (e) => {
      const button = closestFromEvent(e, ".button");
      const action = button?.dataset.action;
      if (action === "block") {
        handleBlock(button!);
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
