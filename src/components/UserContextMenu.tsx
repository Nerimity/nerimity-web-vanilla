import { t } from "@lingui/core/macro";

import { h } from "../h";
import { portalElement } from "../utils/portal";
import { ContextMenu } from "./message-pane/ContextMenu";
import { createModal } from "./modal";

export const createUserContextMenuHandler = (opts: { signal: AbortSignal }) => {
  document.body.addEventListener("contextmenu", (event) => {
    console.log("hmm");
    const target = event.target as HTMLElement;
    const userEl = target.closest(`[data-user-id]`) as HTMLElement;
    if (!userEl) return;
    const userId = userEl.dataset?.userId!;

    const abortController = new AbortController();

    if (!userId) return;
    event.stopPropagation();
    event.preventDefault();

    portalElement().addEventListener(
      "click",
      (event) => {
        abortController.abort();
        const target = event.target as HTMLElement;
        const item = target.closest(".ctx-item");
        const id = item?.id;
        switch (id) {
          case "copy_id":
            navigator.clipboard.writeText(userId);
            break;

          default:
            break;
        }
      },
      { signal: abortController.signal },
    );

    createModal(
      () => (
        <UserContextMenu x={`${event.clientX}px`} y={`${event.clientY}px`} />
      ),
      abortController,
    );
    opts.signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });
  });
};

const UserContextMenu = (props: { x: string; y: string }) => {
  return (
    <ContextMenu.Root pos={{ x: props.x, y: props.y }} id="user-ctx">
      <ContextMenu.Item id="edit">
        <ContextMenu.Icon name="edit" />
        <ContextMenu.Label>{t`View Profile`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item id="copy_id">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy ID`}</ContextMenu.Label>
      </ContextMenu.Item>
    </ContextMenu.Root>
  );
};
