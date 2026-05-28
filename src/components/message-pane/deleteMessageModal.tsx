import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h } from "../../h";
import { deleteMessage } from "../../services/messageService";
import type { Message } from "../../store/messageStore";
import { Button } from "../button";
import { createModal, Modal } from "../modal";
import { MessageItem } from "./messageItem";

const deleteMessageBody = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  .messageItem {
    background: var(--gray-900);
    margin: 0;
  }
`;

export const createDeleteMessageModal = (props: { message: Message }) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  requestAnimationFrame(() => {
    body.replaceChildren(
      <div class={deleteMessageBody}>
        {t`Are you sure you want to delete this message?`}
        <MessageItem
          hideNewDayMarker
          message={props.message!}
          container={body}
        />
      </div>,
    );
  });

  const modal = (
    <Modal.Root>
      <Modal.Header alert label={t`Delete Message`} icon="delete" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Delete`}
          hoverBorder
        />
        <Button
          data-action="delete"
          class="button"
          icon="delete"
          label={t`Delete`}
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let deleting = false;

  const handleDeleteMessage = async (button: HTMLElement) => {
    if (deleting) return;
    const label = button?.querySelector(".label")!;
    deleting = true;
    label.textContent = t`Deleting...`;

    const [, error] = await deleteMessage(
      props.message.channelId,
      props.message.id,
    );
    deleting = false;
    label.textContent = t`Delete`;
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
      if (action === "delete") {
        handleDeleteMessage(button!);
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
