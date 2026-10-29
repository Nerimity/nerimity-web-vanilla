import { t } from "@lingui/core/macro";

import { deletePost } from "../../services/PostService";
import type { RawPost } from "../../Types";
import { closestFromEvent } from "../../utils/dom";
import { Button } from "../ui/button";
import { createModal, Modal } from "../ui/modal";
import { postCache, PostItem, PostNotFound } from "./PostItem";

import style from "./deletePostModal.module.css";

export const createDeletePostModal = (props: { post: RawPost }) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const body = (<Modal.Body width="400px"></Modal.Body>) as HTMLDivElement;

  requestAnimationFrame(() => {
    body.replaceChildren(
      <div class={style.deleteBody}>
        {t`Are you sure you want to delete this post?`}
        <PostItem hideNewDayMarker post={props.post!} container={body} />
      </div>,
    );
  });

  const modal = (
    <Modal.Root>
      <Modal.Header alert label={t`Delete Post`} icon="delete" />
      {body}
      <Modal.Footer>
        <Button
          class="button"
          data-action="close"
          label={t`Don't Delete`}
          hoverBorder
        />
        <Button
          data-action="delete"
          class="button"
          icon="delete"
          label={t`Delete`}
          alert
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let deleting = false;

  const handleDelete = async (button: HTMLElement) => {
    if (deleting) return;
    const label = button?.querySelector(".label")!;
    deleting = true;
    label.textContent = t`Deleting...`;

    const [, error] = await deletePost(props.post.id);
    if (error) {
      alert({ message: error.message });
      return;
    }
    postCache.delete(props.post.id);
    document
      .querySelectorAll(`[data-post-id="${props.post.id}"]`)
      .forEach((el) => {
        el.replaceChildren(<PostNotFound />);
      });
    deleting = false;
    label.textContent = t`Delete`;
    if (!error) {
      abortController.abort();
    }
  };

  modal.addEventListener(
    "click",
    async (e) => {
      const button = closestFromEvent(e, ".button");
      const action = button?.dataset.action;
      if (action === "delete") {
        handleDelete(button!);
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
