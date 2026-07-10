import { t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { h } from "../h";
import { banServerMember } from "../services/serverService";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { createModal, Modal } from "./modal";

import style from "./BanMemberModal.module.css";

export const createBanMemberModal = (props: {
  userId: string;
  username?: string;
}) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const user = userStore.users.get(props.userId)!;
  const username = props.username || user.username;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;
  let deleteRecentMessages = false;

  requestAnimationFrame(() => {
    const checkboxEl = (
      <Checkbox.Root>
        <Checkbox.Box />
        <Checkbox.Label>{t`Delete messages sent in the past 7 hours.`}</Checkbox.Label>
      </Checkbox.Root>
    ) as HTMLDivElement;
    body.replaceChildren(
      <div class={style.body}>
        <span class={style.message}>
          <Trans>
            Are you sure you want to ban{" "}
            <span class={style.username}>{username}</span>
          </Trans>
        </span>
        <Input id="ban-reason" label={t`Reason (optional)`} />
        {checkboxEl}
      </div>,
    );

    Checkbox.createHandler({
      el: checkboxEl,
      onChange: (checked) => {
        deleteRecentMessages = checked;
      },
      signal,
    });
  });

  const modal = (
    <Modal.Root>
      <Modal.Header alert label={t`Ban ${username}`} icon="logout" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Ban`}
          hoverBorder
        />
        <Button
          data-action="ban"
          class="button"
          icon="logout"
          label={t`Ban`}
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const handleBan = async (button: HTMLElement) => {
    if (requesting) return;
    const label = button?.querySelector(".label")!;
    requesting = true;
    label.textContent = t`Banning...`;

    const reason = (document.getElementById("ban-reason") as HTMLInputElement)
      .value;

    const [, error] = await banServerMember({
      serverId: serverStore.currentServerId!,
      userId: props.userId,
      reason,
      deleteRecentMessages,
    });
    requesting = false;
    label.textContent = t`Ban`;
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
      if (action === "ban") {
        handleBan(button!);
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
