import { t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { addFriend } from "../../services/friendService";
import { closestFromEvent } from "../../utils/dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { createModal, Modal } from "../ui/modal";
import { createStatusMessage } from "../ui/StatusMessage";

import style from "./AddFriendModal.module.css";

export const createAddFriendModal = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  const statusMessage = createStatusMessage();

  requestAnimationFrame(() => {
    body.replaceChildren(
      <div class={style.body}>
        <span class={style.message}>
          <Trans>
            Enter your friend's <strong>username</strong> and{" "}
            <strong>tag</strong> to add them.
          </Trans>
        </span>
        <Input placeholder={t`Username:Tag`} />
        {statusMessage.element}
      </div>,
    );
  });

  const modal = (
    <Modal.Root>
      <Modal.Header label={t`Add Friend`} icon="person_add" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Close`}
          hoverBorder
        />
        <Button
          data-action="add"
          class="button"
          icon="person_add"
          label={t`Add Friend`}
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const handleAddFriend = async (button: HTMLElement) => {
    if (requesting) return;
    statusMessage.set();
    const label = button?.querySelector(".label")!;
    requesting = true;
    label.textContent = t`Adding...`;
    const input = modal.querySelector("input") as HTMLInputElement;
    const value = input.value;

    const [username, tag] = value.split(":");
    if (!username || !tag) {
      requesting = false;
      label.textContent = t`Add Friend`;
      statusMessage.set(t`Invalid format. Use Username:Tag`);
      return;
    }

    const [, error] = await addFriend({ username, tag });
    requesting = false;
    label.textContent = t`Add Friend`;
    if (error) {
      statusMessage.set(error.message);
      return;
    }
    statusMessage.set(t`Friend Request Sent!`, "success");
  };

  modal.addEventListener(
    "click",
    async (e) => {
      const button = closestFromEvent(e, ".button");
      const action = button?.dataset.action;
      if (action === "add") {
        handleAddFriend(button!);
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
