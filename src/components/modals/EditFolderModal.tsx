import { t } from "@lingui/core/macro";

import { updateServerFolder } from "../../services/serverService";
import { accountStore } from "../../store/accountStore";
import { closestFromEvent } from "../../utils/dom";
import { Icon } from "../icon";
import { Button } from "../ui/button";
import { createColorPickerModalLazy } from "../ui/createColorPickerLazy";
import { Input } from "../ui/input";
import { createModal, Modal } from "../ui/modal";
import { createStatusMessage } from "../ui/StatusMessage";

import style from "./EditFolderModal.module.css";

export const createEditFolderModal = (props: { folderId: string }) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const folder = accountStore.currentUser?.serverFolders.find(
    (f) => f.id === props.folderId,
  );
  if (!folder) return abortController.abort();

  const status = createStatusMessage();
  let newColor: null | string = null;
  const body = (
    <Modal.Body width="320px" class={style.body}>
      <div class={style.container}>
        <div class={style.folderPreview} style={{ "--color": folder.color }}>
          <Icon class={style.folderIcon} name="folder_open" />
          <Icon class={style.paletteIcon} name="palette" />
        </div>
        <Input class={style.input} value={folder.name} />
      </div>
      {status.element}
    </Modal.Body>
  ) as HTMLDivElement;

  const folderPreviewEl = body.querySelector(
    `.${style.folderPreview}`,
  ) as HTMLDivElement;
  const inputEl = body.querySelector(
    `.${style.input} input`,
  ) as HTMLInputElement;

  folderPreviewEl.addEventListener(
    "click",
    () => {
      createColorPickerModalLazy({
        triggerEl: folderPreviewEl,
        color: newColor || folder.color,
        alpha: false,
        gradientTab: false,
        onChange(color) {
          folderPreviewEl.setAttribute("style", `--color: ${color}`);
          newColor = color;
        },
      });
    },
    { signal },
  );

  const modal = (
    <Modal.Root>
      <Modal.Header label={t`Update Folder`} icon="folder_open" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Update`}
          hoverBorder
        />
        <Button
          data-action="update"
          class="button"
          icon="edit"
          label={t`Update`}
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;
  modal.addEventListener(
    "click",
    async (e) => {
      const button = closestFromEvent(e, ".button");
      const action = button?.dataset.action;

      if (action === "close") {
        abortController.abort();
      }

      if (action === "update") {
        if (requesting) return;
        requesting = true;
        status.set();
        const [, err] = await updateServerFolder(props.folderId, {
          color: newColor || folder.color,
          name: inputEl.value.trim(),
        });
        requesting = false;
        if (err) {
          status.set(err.message, "error");
          return;
        }
        abortController.abort();
      }
    },
    { signal },
  );

  createModal(() => {
    return modal;
  }, abortController);
};
