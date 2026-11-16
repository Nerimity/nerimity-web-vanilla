import { t } from "@lingui/core/macro";

import { pinMessage, unpinMessage } from "../../services/messageService";
import type { Message } from "../../store/messageStore";
import { closestFromEvent } from "../../utils/dom";
import { Button } from "../ui/button";
import { createModal, Modal } from "../ui/modal";
import { MessageItem } from "./messageItem";

import style from "./pinMessageModal.module.css";

export const createPinMessageModal = (props: {
  message: Message;
  skipConfirmation?: boolean;
}) => {
  const pinned = props.message.pinned;

  if (props.skipConfirmation) {
    pinOrUnpin(props.message)(props.message.channelId, props.message.id);
    return;
  }
  const abortController = new AbortController();
  const { signal } = abortController;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  requestAnimationFrame(() => {
    body.replaceChildren(
      <div class={style.pinMessageBody}>
        {pinned ? t`Unpin this message?` : t`Pin this message?`}
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
      <Modal.Header
        alert={pinned}
        label={pinned ? t`Unpin Message` : t`Pin Message`}
        icon="push_pin"
      />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Cancel`}
          hoverBorder
        />
        <Button
          data-action="pin"
          class="button"
          icon="push_pin"
          label={pinned ? t`Unpin Message` : t`Pin Message`}
          alert={pinned}
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const handlePinMessage = async (button: HTMLElement) => {
    if (requesting) return;
    const label = button?.querySelector(".label")!;
    requesting = true;
    label.textContent = pinned ? t`Unpinning...` : t`Pinning...`;

    const [, error] = await pinOrUnpin(props.message)(
      props.message.channelId,
      props.message.id,
    );
    requesting = false;
    label.textContent = pinned ? t`Unpin Message` : t`Pin Message`;
    if (!error) {
      abortController.abort();
    }
  };

  modal.addEventListener(
    "click",
    async (e) => {
      const button = closestFromEvent(e, ".button");
      const action = button?.dataset.action;
      if (action === "pin") {
        handlePinMessage(button!);
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

function pinOrUnpin(message: Message) {
  if (message.pinned) return unpinMessage;
  return pinMessage;
}
