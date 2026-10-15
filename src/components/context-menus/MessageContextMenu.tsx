import { t } from "@lingui/core/macro";

import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { messageStore, type Message } from "../../store/messageStore";
import { createDeleteMessageModal } from "../message-pane/deleteMessageModal";
import { canDeleteMessage } from "../message-pane/utils";
import { ContextMenu } from "../ui/ContextMenu";

export const MessageContextMenu = (props: {
  message: Message;
  x: string;
  y: string;
}) => {
  const canEdit = props.message.createdBy.id === accountStore.currentUser?.id;

  return (
    <ContextMenu.Root pos={{ x: props.x, y: props.y }} id="msg-ctx">
      {canEdit && (
        <ContextMenu.Item id="edit">
          <ContextMenu.Icon name="edit" />
          <ContextMenu.Label>{t`Edit Message`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      <ContextMenu.Item id="reply">
        <ContextMenu.Icon name="reply" />
        <ContextMenu.Label>{t`Reply Message`}</ContextMenu.Label>
      </ContextMenu.Item>
      {canDeleteMessage({ message: props.message }) && (
        <ContextMenu.Item alert id="delete">
          <ContextMenu.Icon name="delete" />
          <ContextMenu.Label>{t`Delete Message`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      <ContextMenu.Separator />
      <ContextMenu.Item id="copy">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy Content`}</ContextMenu.Label>
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

export const createMessageContextMenuHandler = (opts: {
  el: HTMLElement;
  signal: AbortSignal;
}) => {
  ContextMenu.createHandler({
    el: opts.el,
    signal: opts.signal,
    selector: "[data-message-id]",
    attr: "messageId",
    shouldSkip: (target) => {
      if (target.closest(".reactionItem")) return true;
      return !!target.closest("[data-user-id]");
    },
    resolveData: (messageId) =>
      messageStore.messages
        .get(channelStore.currentChannelId!)
        ?.find((m) => m.id === messageId),
    renderMenu: ({ data, x, y }) => (
      <MessageContextMenu message={data} x={x} y={y} />
    ),
    onAction: (actionId, { data: message, event }) => {
      switch (actionId) {
        case "delete":
          createDeleteMessageModal({
            message,
            skipConfirmation: event.shiftKey,
          });
          break;
        case "edit":
          channelStore.setEditingMessage(
            channelStore.currentChannelId!,
            message,
          );
          break;
        case "copy":
          navigator.clipboard.writeText(message.content || "");
          break;
        case "copy_id":
          navigator.clipboard.writeText(message.id);
          break;
        case "copy_object":
          console.log("Copied Object to clipboard", message);
          navigator.clipboard.writeText(JSON.stringify(message));
          break;
        case "reply":
          channelStore.addReply(channelStore.currentChannelId!, message);
          break;
      }
    },
  });
};
