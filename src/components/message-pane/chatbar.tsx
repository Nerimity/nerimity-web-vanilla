import { t } from "@lingui/core/macro";

import { h } from "../../h";
import { postTyping } from "../../services/channelService";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { messageStore } from "../../store/messageStore";
import { userStore } from "../../store/userStore";
import { MessageType } from "../../Types";
import { storeEmitter } from "../../utils/EventEmitter";
import { userAgent } from "../../utils/userAgent";
import { Button } from "../button";
import { createExpressionPicker } from "../ExpressionPicker";
import { createFileInput } from "../FileInput";
import { createTextareaHeightHandler, Input } from "../input";
import { createAttachmentIndicator } from "./attachmentIndicator";
import { createEditMessageIndicator } from "./editMessageIndicator";
import { createJumpToPresent } from "./JumpToPresent";
import { createRepliesIndicator } from "./repliesIndicator";
import { createTypingIndicator } from "./typingIndicator";

import style from "./chatbar.module.css";

export const createChatbar = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const typingIndicator = createTypingIndicator(abortController);
  const editMessageIndicator = createEditMessageIndicator(signal);
  const attachmentIndicator = createAttachmentIndicator(signal);
  let repliesIndicator = createRepliesIndicator(abortController);
  const jumpToPresent = createJumpToPresent({ signal });

  let emojiPickerButton = (
    <Button class={[style.button!]} icon="face" hoverBorder />
  ) as HTMLElement;

  let sendButton = (
    <Button class={[style.button!, "send"]} icon="send" hoverBorder />
  ) as HTMLElement;
  let editButton = (
    <Button
      class={[style.button!, "edit", style.hide!]}
      icon="edit"
      hoverBorder
    />
  ) as HTMLElement;

  let attachButton = (
    <Button class={[style.button!, "attach"]} icon="attach_file" hoverBorder />
  ) as HTMLElement;
  let cancelButton = (
    <Button
      class={[style.button!, "cancel", style.hide!]}
      icon="close"
      alert
      hoverBorder
    />
  ) as HTMLElement;

  const updateCancelButton = () => {
    let shouldShowCancel = false;
    const property = channelStore.currentChannelProperty()!;
    if (property.attachment) shouldShowCancel = true;
    if (property.editingMessage) shouldShowCancel = true;
    if (property.replyingMessages?.length) shouldShowCancel = true;

    cancelButton.classList.toggle(style.hide!, !shouldShowCancel);
    attachButton.classList.toggle(style.hide!, shouldShowCancel);
  };
  updateCancelButton();

  const handleFileInput = (file?: File) => {
    channelStore.updateAttachment(channelStore.currentChannelId!, file);
  };

  const fileInput = createFileInput({ signal, onChange: handleFileInput });
  const handleAttachClick = () => {
    fileInput.trigger();
  };

  const handleEmojiClick = () => {
    createExpressionPicker({ targetEl: emojiPickerButton });
  };

  let chatbar = (
    <div class={style.chatbarContainer}>
      {jumpToPresent}
      {typingIndicator.el}
      {editMessageIndicator}
      {attachmentIndicator}
      {repliesIndicator}
      <div class={style.chatInputContainer}>
        <Input
          type="textarea"
          id="message-input"
          class={style.chatInput}
          prefix={
            <div class={style.buttons}>
              {attachButton}
              {cancelButton}
            </div>
          }
          suffix={
            <div class={style.buttons}>
              {emojiPickerButton}
              {sendButton}
              {editButton}
            </div>
          }
        />
      </div>
    </div>
  ) as unknown as HTMLElement;
  let input = chatbar.querySelector(
    `.${style.chatInput} .input`,
  ) as HTMLTextAreaElement;

  let lastInputAt = 0;
  const handleInput = () => {
    const property = channelStore.currentChannelProperty()!;
    property.content = input.value.trim();
    if (lastInputAt >= Date.now() - 4000) {
      return;
    }
    lastInputAt = Date.now();
    postTyping(channelStore.currentChannel()!.id);
  };

  const sendMessage = () => {
    lastInputAt = 0;
    const property = channelStore.currentChannelProperty()!;
    input.focus();
    const value = input.value.trim();
    const hasAttachment = property.attachment;
    if (!value && !hasAttachment) return;
    property.content = "";
    input.value = "";

    textHeight.adjust();

    if (property.editingMessage) {
      messageStore.editMessage(
        channelStore.currentChannel()!.id,
        property.editingMessage.id,
        value,
      );
      channelStore.setEditingMessage(channelStore.currentChannelId!, undefined);
      return;
    }

    messageStore.sendMessage(channelStore.currentChannel()!.id, {
      content: value,
    });
    channelStore.removeReply(channelStore.currentChannelId!);
    channelStore.updateAttachment(channelStore.currentChannelId!);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      if (userAgent.mobile) return;
      if (event.shiftKey) return;
      sendMessage();
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      handleCancelClick();

      return;
    }
    if (event.key === "ArrowUp") {
      const channelId = channelStore.currentChannelId!;
      const property = channelStore.currentChannelProperty();
      if (property?.content) {
        return;
      }
      event.preventDefault();
      const messages = messageStore.messages.get(channelId);
      if (!messages) return;

      const lastMessage = messages.findLast((m) => {
        if (m.state) return;
        if (m.type !== MessageType.CONTENT) return;
        return m.createdBy.id === accountStore.currentUser?.id;
      });

      if (!lastMessage) return;

      channelStore.setEditingMessage(channelId, lastMessage);
      return;
    }
  };

  const handleCancelClick = () => {
    const property = channelStore.currentChannelProperty()!;
    if (property.attachment) {
      channelStore.updateAttachment(channelStore.currentChannelId!);
      return;
    }
    if (property.editingMessage) {
      channelStore.setEditingMessage(channelStore.currentChannelId!);
      return;
    }
    if (property.replyingMessages?.length) {
      channelStore.removeReply(channelStore.currentChannelId!);
      return;
    }
  };

  input.addEventListener("keydown", handleKeyDown, { signal });
  input.addEventListener("input", handleInput, { signal });

  cancelButton.addEventListener("click", handleCancelClick, { signal });
  sendButton.addEventListener("click", sendMessage, { signal });
  attachButton.addEventListener("click", handleAttachClick, { signal });
  emojiPickerButton.addEventListener("click", handleEmojiClick, { signal });
  const textHeight = createTextareaHeightHandler({ textarea: input, signal });

  const render = () => {
    updatePlaceholder();
    return chatbar;
  };

  const updatePlaceholder = () => {
    const channel = channelStore.currentChannel();
    const authenticated = accountStore.authenticated;

    if (!channel) {
      if (!authenticated) {
        input.placeholder = accountStore.connectionState();
      }

      return;
    }

    if (channel.serverId) {
      input.placeholder = t`Message in ${channel.name!}`;
    } else {
      const inbox = inboxStore.inboxes.get(channel.id);
      if (!inbox) return;
      const user = userStore.users.get(inbox.recipientId);
      input.placeholder = t`Message ${user?.username ?? ""}`;
    }
  };

  const syncValue = () => {
    const property = channelStore.currentChannelProperty()!;
    input.value = property.content || "";

    const isEditing = !!property.editingMessage;

    sendButton.classList.toggle(style.hide!, isEditing);
    editButton.classList.toggle(style.hide!, !isEditing);
  };

  storeEmitter.on(
    "navigate:channelId",
    () => {
      lastInputAt = 0;

      syncValue();
      updatePlaceholder();
      textHeight.adjust();
      updateCancelButton();
    },
    signal,
  );
  storeEmitter.on(
    "message_property:attachment",
    () => {
      input.focus();
      updateCancelButton();
    },
    signal,
  );
  storeEmitter.on(
    "message_property:replying",
    () => {
      input.focus();
      updateCancelButton();
    },
    signal,
  );
  storeEmitter.on(
    "message_property:editing",
    () => {
      syncValue();
      input.focus();
      updateCancelButton();
    },
    signal,
  );

  storeEmitter.on("ws:authStateUpdate", updatePlaceholder, signal);
  storeEmitter.on("ws:connectStateUpdate", updatePlaceholder, signal);
  createFileClipboardHandler({ signal });

  const destroy = () => {
    abortController.abort();

    chatbar.remove();
    sendButton.remove();
    editButton.remove();
    attachButton.remove();
    cancelButton.remove();
    input.remove();
    (chatbar as any) = null;
    (sendButton as any) = null;
    (editButton as any) = null;
    (attachButton as any) = null;
    (cancelButton as any) = null;
    (input as any) = null;
  };

  return { render, destroy, jumpToPresentButton: jumpToPresent };
};

const createFileClipboardHandler = (opts: { signal: AbortSignal }) => {
  document.addEventListener(
    "paste",
    (event) => {
      const file = event.clipboardData?.files[0];
      if (!file) return;
      channelStore.updateAttachment(channelStore.currentChannelId!, file);
    },
    { signal: opts.signal },
  );
};
