import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { Checkbox } from "../../../components/checkbox";
import { Input } from "../../../components/input";
import { createModal, Modal } from "../../../components/modal";
import { Notice } from "../../../components/Notice";
import { deleteAccount } from "../../../services/userService";
import { serverStore } from "../../../store/serverStore";
import { logout } from "../../../utils/logout";

import style from "./DeleteAccountModal.module.css";

export const createDeleteAccountModal = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const isInServers = !!serverStore.servers.size;

  let deletePostsAndMessages = true;

  const modal = (
    <Modal.Root ignoreBgClick disableGestures>
      <Modal.Header label={t`Delete Account`} alert icon="delete" />

      <Modal.Body width="400px">
        <div class={style.body}>
          {isInServers && (
            <Notice
              type="info"
              description={t`You must leave or delete all servers you're in before deleting your account.`}
            />
          )}

          <div class={[isInServers && style.disabled]}>
            <div>{t`Sorry to see you go :( If something didn't work for you, let us know in the official server.`}</div>

            <div class={style.deleteListTitle}>{t`What will get deleted:`}</div>
            <ul class={style.deleteList}>
              <li>{t`Email Address`}</li>
              <li>{t`Username`}</li>
              <li>{t`IP Address`}</li>
              <li>{t`Your Bio`}</li>
            </ul>

            <Checkbox.Root
              class={style.checkbox}
              checked={deletePostsAndMessages}
            >
              <Checkbox.Box />
              <Checkbox.Label>{t`Also delete my posts and messages`}</Checkbox.Label>
            </Checkbox.Root>

            <Notice
              type="info"
              description={t`Your posts and messages may take weeks to delete.`}
            />
            <Input
              class={style.input}
              id="password"
              type="password"
              label={t`Confirm Password`}
              placeholder="******"
            />

            <div class={style.error}></div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          data-action="close"
          label={t`Don't Delete`}
          icon="close"
          hoverBorder
        />
        <Button
          data-action="delete"
          class={[isInServers && style.disabled]}
          label={t`Delete Account`}
          icon="delete"
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  const setError = (val?: string) => {
    const el = modal.querySelector(`.${style.error}`) as HTMLDivElement;
    el.style.display = val ? "flex" : "none";
    el.textContent = val || "";
  };

  let requesting = false;

  modal.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest(`[data-action]`) as HTMLElement;
      if (!button) return;
      const buttonLabel = button.querySelector(".label") as HTMLDivElement;

      if (button.dataset.action === "delete") {
        if (requesting) return;
        requesting = true;
        buttonLabel.textContent = t`Deleting...`;

        const passwordEl = modal.querySelector("#password") as HTMLInputElement;

        const [, error] = await deleteAccount({
          password: passwordEl.value,
          deleteContent: deletePostsAndMessages,
        });
        requesting = false;
        buttonLabel.textContent = t`Delete Account`;

        if (error) {
          setError(error.message);
          return;
        }
        logout({ keepCache: false, redirect: true });
      }
      if (button.dataset.action === "close") {
        abortController.abort();
      }
    },
    { signal },
  );

  Checkbox.createHandler({
    el: modal,
    signal,
    onChange(checked) {
      deletePostsAndMessages = checked;
    },
  });

  createModal(() => {
    return modal;
  }, abortController);
};
