import { t } from "@lingui/core/macro";

import { h } from "../h";
import { Button } from "./button";
import { Modal } from "./modal";

import style from "./LinkWarnModal.module.css";

export const LinkWarnModal = (props: { url: string }) => {
  return (
    <Modal.Root>
      <Modal.Header alert label={t`External link`} icon="warning" />
      <Modal.Body maxWidth="500px">
        <div class={style.body}>
          <div>{t`You are about to visit an external link.`}</div>
          <div class={style.url}>{props.url}</div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button label={t`Don't visit`} icon="close" hoverBorder />
        <Button
          label={t`Visit site`}
          icon="open_in_new"
          alert
          href={props.url}
          component="a"
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  );
};
