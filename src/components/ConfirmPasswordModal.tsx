import { t } from "@lingui/core/macro";

import { Button } from "./button";
import { Input } from "./input";
import { createModal, Modal } from "./modal";

import style from "./ConfirmPasswordModal.module.css";

export const createConfirmPasswordModal = (opts: {
  onConfirm: (password?: string) => void;
}) => {
  const abortController = new AbortController();

  const modal = (
    <Modal.Root ignoreBgClick>
      <Modal.Header label={t`Confirm Password`} icon="shield" />
      <Modal.Body maxWidth="500px">
        <div class={style.body}>
          <div>{t`Enter your password to continue.`}</div>
          <Input type="password" placeholder="*******" />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button data-button label={t`Don't Confirm`} icon="close" hoverBorder />
        <Button
          data-action="confirm"
          data-button
          label={t`Confirm`}
          icon="check"
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let password: string | undefined = undefined;
  modal.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest(`[data-button]`) as HTMLElement;
      if (!button?.dataset?.button) return;

      password = undefined;
      if (button.dataset.action === "confirm") {
        password = modal.querySelector("input")?.value;
      }

      abortController.abort();
    },
    { signal: abortController.signal },
  );

  abortController.signal.addEventListener(
    "abort",
    () => {
      opts.onConfirm(password);
    },
    { once: true },
  );

  createModal(() => {
    return modal;
  }, abortController);
};
