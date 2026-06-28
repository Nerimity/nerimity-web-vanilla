import { t } from "@lingui/core/macro";

import { h } from "../h";
import { Button } from "./button";
import { createModal, Modal } from "./modal";

import style from "./LinkWarnModal.module.css";

export const createLinkWarnModal = (url: string) => {
  const abortController = new AbortController();

  const modal = (
    <Modal.Root>
      <Modal.Header label={t`External link`} icon="open_in_new" />
      <Modal.Body maxWidth="500px">
        <div class={style.body}>
          <div>{t`You are about to visit an external link.`}</div>
          <div class={style.url}>{url}</div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button data-button label={t`Don't visit`} icon="close" hoverBorder />
        <Button
          data-button
          label={t`Visit site`}
          icon="open_in_new"
          href={url}
          component="a"
          target="_blank"
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  modal.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest(`[data-button]`) as HTMLElement;
      if (!button?.dataset?.button) return;
      abortController.abort();
    },
    { signal: abortController.signal },
  );

  createModal(() => {
    return modal;
  }, abortController);
};
