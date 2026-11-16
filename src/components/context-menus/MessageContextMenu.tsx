import { t } from "@lingui/core/macro";

import { markChannelUnread } from "../../services/channelService";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { messageStore, type Message } from "../../store/messageStore";
import { MessageType, type HtmlNode } from "../../Types";
import { storeEmitter } from "../../utils/EventEmitter";
import { RolePermissionFlag } from "../../utils/RolePermissionFlag";
import { createDeleteMessageModal } from "../message-pane/deleteMessageModal";
import { createPinMessageModal } from "../message-pane/pinMessageModal";
import { canDeleteMessage } from "../message-pane/utils";
import { ContextMenu } from "../ui/ContextMenu";

function nodeToString(node: HtmlNode): string {
  const attrs = Object.entries(node.attributes ?? {})
    .map(([key, value]) => ` ${key}="${value.replace(/"/g, "&quot;")}"`)
    .join("");

  const children = node.content
    .map((item) => (typeof item === "string" ? item : nodeToString(item)))
    .join("");

  return `<${node.tag}${attrs}>${children}</${node.tag}>`;
}

function htmlEmbedToString(input: string | HtmlNode | HtmlNode[]): string {
  if (typeof input === "string") return input;
  if (Array.isArray(input)) return input.map(nodeToString).join("\n");
  return nodeToString(input);
}

export const MessageContextMenu = (props: {
  message: Message;
  x: string;
  y: string;
}) => {
  const content = props.message.content;
  const pinned = props.message.pinned;

  const isContent = props.message.type === MessageType.CONTENT;
  const canEdit =
    isContent && props.message.createdBy.id === accountStore.currentUser?.id;

  const channel = props.message.channel;
  const server = channel?.server;
  const member = server?.currentMember;

  const canPin = (() => {
    if (!isContent) return;
    if (!server) return true;
    if (!member) return;
    return member.hasPerm(RolePermissionFlag.manageChannels.bit);
  })();

  return (
    <ContextMenu.Root pos={{ x: props.x, y: props.y }} id="msg-ctx">
      <ContextMenu.Item id="mark_unread">
        <ContextMenu.Icon name="mark_chat_unread" />
        <ContextMenu.Label>{t`Mark Unread`}</ContextMenu.Label>
      </ContextMenu.Item>
      {canPin && (
        <ContextMenu.Item id="pin" alert={pinned}>
          <ContextMenu.Icon name="push_pin" />
          <ContextMenu.Label>
            {pinned ? t`Unpin Message` : t`Pin Message`}
          </ContextMenu.Label>
        </ContextMenu.Item>
      )}
      {canEdit && (
        <ContextMenu.Item id="edit">
          <ContextMenu.Icon name="edit" />
          <ContextMenu.Label>{t`Edit Message`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      <ContextMenu.Item id="quote">
        <ContextMenu.Icon name="format_quote" />
        <ContextMenu.Label>{t`Quote Message`}</ContextMenu.Label>
      </ContextMenu.Item>
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
      {props.message.htmlEmbed && (
        <ContextMenu.Item id="copy_html">
          <ContextMenu.Icon name="content_copy" />
          <ContextMenu.Label>{t`Copy HTML`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      {content?.trim() && (
        <ContextMenu.Item id="copy">
          <ContextMenu.Icon name="content_copy" />
          <ContextMenu.Label>{t`Copy Content`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
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
  mode?: "contextmenu" | "click" | "manual";
}) => {
  return ContextMenu.createHandler({
    el: opts.el,
    signal: opts.signal,
    mode: opts.mode,
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
    onAction: async (actionId, { data: message, event }) => {
      switch (actionId) {
        case "quote":
          storeEmitter.emit("quote_message", { message });
          break;
        case "delete":
          createDeleteMessageModal({
            message,
            skipConfirmation: event.shiftKey,
          });
          break;
        case "mark_unread":
          markChannelUnread(message.channelId, message.id);
          break;
        case "pin":
          createPinMessageModal({ message, skipConfirmation: event.shiftKey });
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
        case "copy_html":
          navigator.clipboard.writeText(htmlEmbedToString(message.htmlEmbed!));
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
