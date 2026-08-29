import { t } from "@lingui/core/macro";

import { decrypt, encrypt, generateSecret } from "../utils/encryption";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { createModal, Modal } from "./modal";

import style from "./ConfirmPasswordModal.module.css";

let secret = generateSecret();

let encPassword: string | undefined = undefined;
let savePassword = false;
let savedAt = 0;

export type ConfirmPasswordModal = ReturnType<
  typeof createConfirmPasswordModal
>;

export const createConfirmPasswordModal = (opts: {
  onConfirm: (password?: string) => void;
  alert?: boolean;
  disableAutoclose?: boolean;
  allowSavePassword?: boolean;
}) => {
  if (Date.now() - savedAt >= 5 * 60_000) {
    encPassword = undefined;
  }
  if (!opts.allowSavePassword) {
    encPassword = undefined;
  }
  const abortController = new AbortController();

  const error = (<div class={style.error}></div>) as HTMLDivElement;

  const modal = (
    <Modal.Root ignoreBgClick>
      <Modal.Header
        alert={opts.alert}
        label={t`Confirm Password`}
        icon="shield"
      />
      <Modal.Body maxWidth="500px">
        <div class={style.body}>
          <div>{t`Enter your password to continue.`}</div>
          <Input type="password" placeholder="*******" />
          {opts.allowSavePassword && (
            <Checkbox.Root checked={savePassword}>
              <Checkbox.Box />
              <Checkbox.Label>{t`Remember for 5 minutes`}</Checkbox.Label>
            </Checkbox.Root>
          )}
          {error}
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
          alert={opts.alert}
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  if (encPassword) {
    try {
      decrypt(encPassword, secret).then((pwd) => {
        modal.querySelector("input")!.value = pwd;
      });
    } catch (err) {
      console.log(err);
    }
  }

  Checkbox.createHandler({
    el: modal,
    onChange(checked) {
      savePassword = checked;
    },
    signal: abortController.signal,
  });

  let requesting = false;

  const buttonLabel = modal.querySelector(
    '[data-action="confirm"] .label',
  ) as HTMLDivElement;

  modal.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest(`[data-button]`) as HTMLElement;
      if (!button?.dataset?.button) return;

      encPassword = undefined;
      if (button.dataset.action === "confirm") {
        if (requesting) return;
        requesting = true;

        setError();

        const password = modal.querySelector("input")?.value;

        try {
          encPassword = await encrypt(password || "", secret);
          savedAt = Date.now();
        } catch (err) {
          console.error(err);
        }

        opts.onConfirm(password);
        if (!opts.disableAutoclose) {
          abortController.abort();
          return;
        }

        buttonLabel.textContent = t`Confirming...`;

        return;
      }

      abortController.abort();
    },
    { signal: abortController.signal },
  );

  abortController.signal.addEventListener(
    "abort",
    () => {
      if (!savePassword || !opts.allowSavePassword) {
        encPassword = undefined;
      }
    },
    { once: true },
  );

  createModal(() => {
    return modal;
  }, abortController);

  const setError = (message?: string) => {
    if (message) {
      requesting = false;
      buttonLabel.textContent = t`Confirm`;
    }
    error.textContent = message || "";
  };

  const close = () => {
    abortController.abort();
  };

  return { setError, close };
};
