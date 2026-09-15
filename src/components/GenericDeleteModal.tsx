import { ph, t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { Button } from "./button";
import { Input } from "./input";
import { createModal, Modal } from "./modal";

import style from "./GenericDeleteModal.module.css";

interface GenericDeleteModalOpts {
  title: string;
  confirmLabel: string;
  onDelete: (done: (error?: string | null) => void) => void;
}

export const createGenericDeleteModal = (opts: GenericDeleteModalOpts) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const el = (
    <Modal.Root>
      <Modal.Header label={opts.title} alert icon="delete" />
      <Modal.Body class={style.body}>
        <span class={style.text}>
          <Trans>
            {"Type "}
            <span class={style.confirm}>
              {ph({ confirmLabel: opts.confirmLabel })}
            </span>
            {" to confirm"}
          </Trans>
        </span>
        <Input placeholder={opts.confirmLabel} />
        <div class={style.error}></div>
      </Modal.Body>
      <Modal.Footer>
        <Button data-action="close" icon="close" label={t`Don't Delete`} />
        <Button
          data-action="delete"
          icon="delete"
          alert
          primary
          label={t`Delete`}
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;
  const input = el.querySelector("input") as HTMLInputElement;
  const deleteBtnLabel = el.querySelector(
    `[data-action="delete"] .label`,
  ) as HTMLInputElement;
  const errorVal = el.querySelector(`.${style.error}`) as HTMLDivElement;

  const setError = (message?: string | null) => {
    errorVal.style.display = message ? "block" : "none";
    errorVal.innerText = message || "";
  };

  let requesting = false;

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;

      const actionBtn = target.closest("[data-action]") as HTMLDivElement;
      const action = actionBtn?.dataset.action;
      if (action === "close") return abortController.abort();

      if (action === "delete") {
        if (requesting) return;
        setError();
        if (input.value !== opts.confirmLabel) {
          return setError(t`Text doesn't match, try again.`);
        }
        requesting = true;
        deleteBtnLabel.innerText = t`Deleting...`;

        opts.onDelete((error) => {
          setError(error);
          if (!error) abortController.abort();
          deleteBtnLabel.innerText = t`Delete`;
        });
      }
    },
    { signal },
  );

  createModal(() => {
    return el;
  }, abortController);
};
