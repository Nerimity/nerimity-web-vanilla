import { t } from "@lingui/core/macro";

import { pinPost, unpinPost } from "../../services/PostService";
import { accountStore } from "../../store/accountStore";
import type { RawPost } from "../../Types";
import { createDeletePostModal } from "../posts/deletePostModal";
import { postCache } from "../posts/PostItem";
import { ContextMenu } from "../ui/ContextMenu";
import { createEditPostModal } from "../ui/EditPostModal";
import { alert } from "../ui/modal";

export const createPostContextMenuHandler = (opts: {
  selector?: string;
  idSelector?: string;
  signal: AbortSignal;
  mode?: "contextmenu" | "click";
}) => {
  ContextMenu.createHandler({
    mode: opts.mode,
    signal: opts.signal,
    selector: opts.selector || "[data-post-id]",
    idSelector: opts.idSelector,
    attr: "postId",
    resolveData: (id) => ({
      post: postCache.get(id),
    }),
    renderMenu: ({ x, y, data }) => (
      <PostContextMenu x={x} y={y} post={data.post!} />
    ),
    onAction: async (actionId, { id: postId, data }) => {
      const post = data.post;
      if (!post) return;
      switch (actionId) {
        case "edit": {
          createEditPostModal({ post });
          break;
        }
        case "delete": {
          createDeletePostModal({ post });
          break;
        }
        case "unpin": {
          const [, err] = await unpinPost(postId);
          if (err) {
            return alert({ message: err.message });
          }
          post.pinned = false;
          break;
        }
        case "pin": {
          const [, err] = await pinPost(postId);
          if (err) {
            return alert({ message: err.message });
          }
          post.pinned = true;
          break;
        }
        case "copy_object":
          console.log("Copied Object to clipboard", post);
          navigator.clipboard.writeText(JSON.stringify(post));
          break;
        case "copy_id":
          navigator.clipboard.writeText(postId);
          break;
        case "copy_content":
          navigator.clipboard.writeText(post?.content ?? "");
          break;
        case "copy_url":
          navigator.clipboard.writeText(`https://nerimity.com/p/${postId}`);
          break;
      }
    },
  });
};

const PostContextMenu = (props: { x: string; y: string; post: RawPost }) => {
  const createdByMe = props.post.createdBy.id === accountStore.currentUser?.id;

  const pinned = props.post.pinned;

  return (
    <ContextMenu.Root pos={{ x: props.x, y: props.y }} id="post-ctx">
      {createdByMe && (
        <>
          {pinned ? (
            <ContextMenu.Item id="unpin" alert>
              <ContextMenu.Icon name="push_pin" />
              <ContextMenu.Label>{t`Unpin Post`}</ContextMenu.Label>
            </ContextMenu.Item>
          ) : (
            <ContextMenu.Item id="pin">
              <ContextMenu.Icon name="push_pin" />
              <ContextMenu.Label>{t`Pin Post`}</ContextMenu.Label>
            </ContextMenu.Item>
          )}
          <ContextMenu.Item id="edit">
            <ContextMenu.Icon name="edit" />
            <ContextMenu.Label>{t`Edit Post`}</ContextMenu.Label>
          </ContextMenu.Item>
          <ContextMenu.Separator />

          <ContextMenu.Item id="delete" alert>
            <ContextMenu.Icon name="delete" />
            <ContextMenu.Label>{t`Delete Post`}</ContextMenu.Label>
          </ContextMenu.Item>
          <ContextMenu.Separator />
        </>
      )}
      <ContextMenu.Item id="copy_content">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy Content`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Item id="copy_url">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy URL`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Item id="copy_id">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy ID`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Item id="copy_object">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy Object`}</ContextMenu.Label>
      </ContextMenu.Item>
    </ContextMenu.Root>
  );
};
