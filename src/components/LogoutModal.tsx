import { t } from "@lingui/core/macro";

import { h } from "../h";
import { logout } from "../utils/logout";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { createModal, Modal } from "./modal";

import style from "./logoutModal.module.css";

export const createLogoutModal = () => {
  let clearLocalSettings = true;
  const abortController = new AbortController();
  const { signal } = abortController;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  requestAnimationFrame(() => {
    body.replaceChildren(
      <div class={style.body}>
        <span class={style.message}>{t`Are you sure you want to logout?`}</span>
        <Checkbox.Root checked={clearLocalSettings}>
          <Checkbox.Box />
          <Checkbox.Label>{t`Clear local settings`}</Checkbox.Label>
        </Checkbox.Root>
      </div>,
    );
  });

  Checkbox.createHandler({
    el: body,
    onChange: (checked) => {
      clearLocalSettings = checked;
    },
    signal,
  });

  const modal = (
    <Modal.Root>
      <Modal.Header alert label={t`Logout`} icon="logout" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Logout`}
          hoverBorder
        />
        <Button
          data-action="logout"
          class="button"
          icon="logout"
          label={t`Logout`}
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  const handleLogout = () => {
    logout({
      keepCache: !clearLocalSettings,
      redirect: true,
    });
  };

  modal.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".button") as HTMLElement | null;
      const action = button?.dataset.action;
      if (action === "logout") {
        handleLogout();
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
