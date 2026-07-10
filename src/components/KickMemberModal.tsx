import { t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { h } from "../h";
import { kickServerMember } from "../services/serverService";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { Button } from "./button";
import { createModal, Modal } from "./modal";

import style from "./kickMemberModal.module.css";

export const createKickMemberModal = (props: { userId: string }) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const user = userStore.users.get(props.userId)!;
  if (!user) {
    abortController.abort();
    return;
  }
  const username = user.username;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  requestAnimationFrame(() => {
    body.replaceChildren(
      <div class={style.body}>
        <span class={style.message}>
          <Trans>
            Are you sure you want to kick{" "}
            <span class={style.username}>{username}</span>
          </Trans>
        </span>
      </div>,
    );
  });

  const modal = (
    <Modal.Root>
      <Modal.Header alert label={t`Kick ${username}`} icon="logout" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Kick`}
          hoverBorder
        />
        <Button
          data-action="kick"
          class="button"
          icon="logout"
          label={t`Kick`}
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const handleKick = async (button: HTMLElement) => {
    if (requesting) return;
    const label = button?.querySelector(".label")!;
    requesting = true;
    label.textContent = t`Kicking...`;

    const [, error] = await kickServerMember({
      serverId: serverStore.currentServerId!,
      userId: props.userId,
    });
    requesting = false;
    label.textContent = t`Kick`;
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
      if (action === "kick") {
        handleKick(button!);
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
