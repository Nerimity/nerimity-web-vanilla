import { t } from "@lingui/core/macro";

import { editPost } from "../../services/PostService";
import type { RawPost } from "../../Types";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { postCache } from "../posts/PostItem";
import { Button } from "./button";
import { handleFormatBar, Input } from "./input";
import { createModal, Modal } from "./modal";

import style from "./EditPostModal.module.css";

export const createEditPostModal = (props: { post: RawPost }) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let changing = false;

  const UpdateButton = () => {
    return (
      <Button
        data-action="update"
        label={changing ? t`Editing...` : t`Edit`}
        icon="edit"
        primary
      />
    );
  };

  let buttonEl = (<UpdateButton />) as HTMLDivElement;
  const modal = (
    <Modal.Root ignoreBgClick>
      <Modal.Header label={t`Edit Post`} icon="edit" />
      <Modal.Body width="400px">
        <div class={style.body}>
          <Input
            showFormatBarEmoji
            showFormatBar
            showFormatBarGif
            id="input"
            type="textarea"
            placeholder="Edit your post..."
          />

          <div class={style.error}></div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          data-action="close"
          label={t`Don't Edit`}
          icon="close"
          hoverBorder
        />
        {buttonEl}
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  const updateButton = () => {
    const newBtn = (<UpdateButton />) as HTMLDivElement;
    buttonEl.replaceWith(newBtn);
    buttonEl = newBtn;
  };

  const inputEl = () => modal.querySelector("#input") as HTMLInputElement;

  handleFormatBar({
    signal,
    inputContainer: modal,
    onTextUpdate(text) {
      inputEl().value = text;
    },
  });

  const setError = (val?: string) => {
    const el = modal.querySelector(`.${style.error}`) as HTMLDivElement;
    el.style.display = val ? "flex" : "none";
    el.textContent = val || "";
  };

  let initialContent = props.post.content || "";
  inputEl().value = initialContent;
  modal.addEventListener(
    "click",
    async (event) => {
      const button = closestFromEvent(event, `[data-action]`);
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

        const [post, error] = await editPost(props.post.id, newContent);
        changing = false;
        postCache.set(props.post.id, post!);
        storeEmitter.emit("post:updated", post!);
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

  createModal(() => {
    return modal;
  }, abortController);
};
