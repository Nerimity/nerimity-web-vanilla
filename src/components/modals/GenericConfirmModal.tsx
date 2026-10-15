import { t } from "@lingui/core/macro";

import { Button } from "../ui/button";
import { createModal, Modal } from "../ui/modal";

import style from "./GenericConfirmModal.module.css";

interface GenericConfirmModalOpts {
  title: string;
  body: JSX.Element | string;
  confirmLabel: string;
  onConfirm: (done: (error?: string | null) => void) => void;
  cancelLabel?: string;
  confirmIcon?: string;
  cancelIcon?: string;
  headerIcon?: string;
  loadingLabel?: string;
  alert?: boolean;
  warn?: boolean;
}

export const createGenericConfirmModal = (opts: GenericConfirmModalOpts) => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const modal = (
    <Modal.Root>
      <Modal.Header
        label={opts.title}
        icon={opts.headerIcon}
        alert={opts.alert}
        warn={opts.warn}
      />
      <Modal.Body>
        {opts.body}
        <div class={style.error} role="alert"></div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          data-action="cancel"
          icon={opts.cancelIcon}
          label={opts.cancelLabel || t`Cancel`}
          hoverBorder
        />
        <Button
          data-action="confirm"
          icon={opts.confirmIcon}
          label={opts.confirmLabel}
          alert={opts.alert}
          warn={opts.warn}
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;
  const confirmLabel = modal.querySelector(
    '[data-action="confirm"] .label',
  ) as HTMLDivElement;
  const errorEl = modal.querySelector(`.${style.error}`) as HTMLDivElement;
  let requesting = false;

  const setError = (message?: string | null) => {
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  };

  modal.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const action = target
        .closest("[data-action]")
        ?.getAttribute("data-action");
      if (action === "cancel") {
        abortController.abort();
        return;
      }
      if (action !== "confirm" || requesting) return;

      requesting = true;
      setError();
      confirmLabel.textContent = opts.loadingLabel || t`Working...`;
      opts.onConfirm((error) => {
        requesting = false;
        confirmLabel.textContent = opts.confirmLabel;
        setError(error);
        if (!error) abortController.abort();
      });
    },
    { signal },
  );

  createModal(() => modal, abortController);
};
