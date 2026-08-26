import { t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { Input } from "../../../components/input";
import { createModal, Modal } from "../../../components/modal";
import {
  deleteUserChannelNotice,
  getUserChannelNotice,
  updateUserChannelNotice,
} from "../../../services/userService";

import style from "./UpdateDMNoticeModal.module.css";

export const createUpdateDMNoticeModal = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let changing = false;

  const UpdateButton = ({ mode }: { mode: "delete" | "update" }) => {
    const deleteLabel = changing ? t`Deleting...` : t`Delete`;
    const updateLabel = changing ? t`Updating...` : t`Update`;

    return (
      <Button
        data-action="update"
        label={mode === "delete" ? deleteLabel : updateLabel}
        icon={mode === "delete" ? "delete" : "check"}
        primary
        alert={mode === "delete"}
      />
    );
  };

  let buttonEl = (<UpdateButton mode="update" />) as HTMLDivElement;
  const modal = (
    <Modal.Root ignoreBgClick>
      <Modal.Header label={t`DM Notice`} icon="info" />
      <Modal.Body width="400px">
        <div class={style.body}>
          <Input
            id="noticeInput"
            type="textarea"
            placeholder="Don't talk to me if you're an insect."
          />

          <div class={style.error}></div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          data-action="close"
          label={t`Don't Update`}
          icon="close"
          hoverBorder
        />
        {buttonEl}
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  const updateButton = () => {
    const newBtn = (
      <UpdateButton
        mode={!initialContent || inputEl().value.trim() ? "update" : "delete"}
      />
    ) as HTMLDivElement;
    buttonEl.replaceWith(newBtn);
    buttonEl = newBtn;
  };

  const inputEl = () => modal.querySelector("#noticeInput") as HTMLInputElement;

  const setError = (val?: string) => {
    const el = modal.querySelector(`.${style.error}`) as HTMLDivElement;
    el.style.display = val ? "flex" : "none";
    el.textContent = val || "";
  };

  let initialContent = "";
  modal.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest(`[data-action]`) as HTMLElement;
      if (!button) return;

      if (button.dataset.action === "update") {
        const newContent = inputEl().value.trim();

        if (newContent === initialContent) {
          abortController.abort();
          return;
        }

        if (changing) return;
        changing = true;
        setError();
        updateButton();

        const [, error] = await (newContent
          ? updateUserChannelNotice(newContent)
          : deleteUserChannelNotice());

        changing = false;
        updateButton();
        if (error) {
          setError(error.message);
          return;
        }

        abortController.abort();
      }
      if (button.dataset.action === "close") {
        abortController.abort();
      }
    },
    { signal },
  );

  inputEl().addEventListener(
    "input",
    () => {
      updateButton();
    },
    { signal },
  );

  (async () => {
    inputEl().disabled = true;
    const [res] = await getUserChannelNotice();
    if (signal.aborted) return;
    initialContent = res?.notice.content.trim() || "";
    inputEl().value = initialContent;
    inputEl().disabled = false;
    inputEl().focus();
    updateButton();
  })();

  createModal(() => {
    return modal;
  }, abortController);
};
