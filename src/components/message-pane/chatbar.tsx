import { t } from "@lingui/core/macro";

import { MAX_FILE_UPLOAD_SIZE } from "../../config";
import { postTyping } from "../../services/channelService";
import type { KlipyItem } from "../../services/klipyService";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { messageStore } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { userStore } from "../../store/userStore";
import { MessageType } from "../../Types";
import { formatTimestampRelative } from "../../utils/date";
import type { CustomEmoji, EmojiData } from "../../utils/emojis";
import { storeEmitter } from "../../utils/EventEmitter";
import { userAgent } from "../../utils/userAgent";
import { createFileInput } from "../FileInput";
import { Icon } from "../icon";
import { Button } from "../ui/button";
import { ExpressionPickerLazy } from "../ui/expression-picker/ExpressionPickerLazy";
import {
  createTextareaHeightHandler,
  handleFormatBar,
  Input,
} from "../ui/input";
import { createAttachmentIndicator } from "./attachmentIndicator";
import { createEditMessageIndicator } from "./editMessageIndicator";
import { createInputSuggestions } from "./inputSuggestions";
import { createJumpToPresent } from "./JumpToPresent";
import { createRepliesIndicator } from "./repliesIndicator";
import { createSelectedCommandIndicator } from "./selectedCommandIndicator";
import { createSlowdownModeIndicator } from "./slowdownModeIndicator";
import { createTypingIndicator } from "./typingIndicator";
import { formatMessage } from "./utils";

import style from "./chatbar.module.css";

export const createChatbar = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const typingIndicator = createTypingIndicator(abortController);
  const editMessageIndicator = createEditMessageIndicator(signal);
  const selectedCommandIndicator = createSelectedCommandIndicator(signal);
  const attachmentIndicator = createAttachmentIndicator(signal);
  let repliesIndicator = createRepliesIndicator(abortController);
  const jumpToPresent = createJumpToPresent({ signal });
  const slowdownModeIndicator = createSlowdownModeIndicator({ signal });

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

  let inputContainerEl = (
    <Input
      showFormatBar
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
  ) as HTMLDivElement;
  let inputEl = inputContainerEl.querySelector(
    "textarea",
  )! as HTMLTextAreaElement;

  handleFormatBar({
    signal,
    inputContainer: inputContainerEl,
    onTextUpdate(text) {
      inputEl.value = text;
      handleInput();
    },
  });

  const inputSuggestions = createInputSuggestions({ signal, inputEl });

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

  const fileInput = createFileInput({
    signal,
    onChange: handleFileInput,
    maxSize: MAX_FILE_UPLOAD_SIZE,
  });
  const handleAttachClick = () => {
    fileInput.trigger();
  };

  const onEmojiPick = (emoji?: EmojiData, custom?: CustomEmoji) => {
    const shortcode = emoji?.short_names[0] || custom?.name;
    if (!shortcode) return;
    inputEl.focus();
    const selStart = inputEl.selectionStart;
    const selEnd = inputEl.selectionEnd;
    inputEl.setRangeText(`:${shortcode}: `, selStart, selEnd, "end");
    const property = channelStore.currentChannelProperty()!;
    property.content = inputEl.value;
  };

  const onGifPick = (gif: KlipyItem) => {
    inputEl.focus();
    inputEl.focus();
    const selStart = inputEl.selectionStart;
    const selEnd = inputEl.selectionEnd;
    inputEl.setRangeText(`${gif.url} `, selStart, selEnd, "end");
    const property = channelStore.currentChannelProperty()!;
    property.content = inputEl.value;
  };

  const handleEmojiClick = () => {
    ExpressionPickerLazy({
      targetEl: emojiPickerButton,
      anchorEl: inputContainerEl,
      offset: { top: -34 },
      onEmojiPick,
      onGifPick,
    });
  };

  const messageSendRestrictionEl = (
    <div
      class={style.messageSendRestrictionContainer}
      style={{ display: "none" }}
    ></div>
  ) as HTMLDivElement;

  const chatInputContainerEl = (
    <div class={style.chatInputContainer}>{inputContainerEl}</div>
  ) as HTMLDivElement;

  let chatbar = (
    <div class={style.chatbarContainer}>
      {jumpToPresent}
      {slowdownModeIndicator}
      {typingIndicator.el}
      {editMessageIndicator}
      {attachmentIndicator}
      {repliesIndicator}
      {inputSuggestions}
      {selectedCommandIndicator}
      {messageSendRestrictionEl}
      {chatInputContainerEl}
    </div>
  ) as unknown as HTMLElement;

  let lastInputAt = 0;
  const handleInput = () => {
    const property = channelStore.currentChannelProperty()!;
    property.content = inputEl.value;
    if (lastInputAt >= Date.now() - 4000) {
      return;
    }
    lastInputAt = Date.now();
    postTyping(channelStore.currentChannel()!.id);
  };

  const sendMessage = () => {
    const property = channelStore.currentChannelProperty()!;
    if (property.slowDownMode) {
      return;
    }
    lastInputAt = 0;
    inputEl.focus();
    const value = inputEl.value.trim();
    const hasAttachment = property.attachment;
    if (!value && !hasAttachment) return;
    property.content = "";
    inputEl.value = "";

    textHeight.adjust();

    const formattedContent = formatMessage({ content: value });

    if (property.editingMessage) {
      messageStore.editMessage(
        channelStore.currentChannel()!.id,
        property.editingMessage.id,
        formattedContent,
      );
      channelStore.setEditingMessage(channelStore.currentChannelId!, undefined);
      return;
    }

    messageStore.sendMessage(channelStore.currentChannel()!.id, {
      content: formattedContent,
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

  inputEl.addEventListener("keydown", handleKeyDown, { signal });
  inputEl.addEventListener("input", handleInput, { signal });

  cancelButton.addEventListener("click", handleCancelClick, { signal });
  sendButton.addEventListener("click", sendMessage, { signal });
  editButton.addEventListener("click", sendMessage, { signal });
  attachButton.addEventListener("click", handleAttachClick, { signal });
  emojiPickerButton.addEventListener("click", handleEmojiClick, { signal });
  const textHeight = createTextareaHeightHandler({ textarea: inputEl, signal });

  const render = () => {
    updatePlaceholder();
    return chatbar;
  };

  const updatePlaceholder = () => {
    const channel = channelStore.currentChannel();
    const authenticated = accountStore.authenticated;

    if (!channel) {
      if (!authenticated) {
        inputEl.placeholder = accountStore.connectionState();
      }

      return;
    }

    if (channel.serverId) {
      const name = channel.name!;
      inputEl.placeholder = t`Message in ${name}`;
    } else {
      const inbox = inboxStore.inboxes.get(channel.id);
      if (!inbox) return;
      const user = userStore.users.get(inbox.recipientId);
      const name = user?.username ?? "";
      inputEl.placeholder = t`Message ${name}`;
    }
  };

  const syncValue = () => {
    const property = channelStore.currentChannelProperty()!;
    inputEl.value = property.content || "";

    const isEditing = !!property.editingMessage;

    sendButton.classList.toggle(style.hide!, isEditing);
    editButton.classList.toggle(style.hide!, !isEditing);
  };

  let visibilityTimeout: any;

  const updateChatbarVisibility = (fromTimeout = false) => {
    if (!fromTimeout && visibilityTimeout) {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = null;
    }
    if (signal.aborted) return;
    const authenticated = accountStore.authenticated;
    if (!authenticated) return;
    const channel = channelStore.currentChannel();
    const canMessage = channel?.canSendMessages();
    chatInputContainerEl.style.display = canMessage ? "flex" : "none";
    messageSendRestrictionEl.style.display = canMessage ? "none" : "flex";

    if (!canMessage) {
      let icon = "lock";
      let reason = t`You don't have permission to send messages in this channel.`;
      let action: any = null;

      const user = accountStore.currentUser;
      const member = serverMemberStore.currentMember(
        serverStore.currentServerId!,
      );

      if (!user?.emailConfirmed) {
        icon = "error";
        reason = t`Confirm your email to send messages.`;
        action = (
          <Button href="/app/settings" label={t`Confirm Email`} primary />
        );
      } else {
        const muted = member?.isMuted();
        if (muted) {
          const timestamp = formatTimestampRelative(
            member?.muteExpireAt!,
            "none",
          );
          icon = "volume_off";
          reason = t`You're muted until ${timestamp}`;
          visibilityTimeout = setTimeout(() => {
            updateChatbarVisibility();
          }, 1000);
        }
      }

      messageSendRestrictionEl.replaceChildren(
        <>
          <div class={style.info}>
            <Icon name={icon} class={[style.icon, style.alert]} />
            <div class={style.reason}>{reason}</div>
          </div>
          {action}
        </>,
      );
    }
  };

  storeEmitter.on(
    "server:update_role",
    (e) => {
      if (e.hasRole && e.serverId === channelStore.currentChannel()?.serverId) {
        updateChatbarVisibility();
      }
    },
    signal,
  );
  storeEmitter.on(
    "server:member_update",
    (e) => {
      if (e.isMe && e.serverId === channelStore.currentChannel()?.serverId) {
        updateChatbarVisibility();
      }
    },
    signal,
  );
  updateChatbarVisibility();

  storeEmitter.on(
    "navigate:channelId",
    () => {
      lastInputAt = 0;

      syncValue();
      updatePlaceholder();
      textHeight.adjust();
      updateCancelButton();
      updateChatbarVisibility();
    },
    signal,
  );
  storeEmitter.on(
    "message_property:attachment",
    () => {
      inputEl.focus();
      updateCancelButton();
    },
    signal,
  );
  storeEmitter.on(
    "message_property:replying",
    () => {
      inputEl.focus();
      updateCancelButton();
    },
    signal,
  );
  storeEmitter.on(
    "message_property:editing",
    () => {
      syncValue();
      inputEl.focus();
      updateCancelButton();
    },
    signal,
  );

  storeEmitter.on(
    "ws:authStateUpdate",
    () => {
      updatePlaceholder();
      updateChatbarVisibility();
    },
    signal,
  );
  storeEmitter.on("ws:connectStateUpdate", updatePlaceholder, signal);
  createFileClipboardHandler({ signal });

  const destroy = () => {
    abortController.abort();

    chatbar.remove();
    sendButton.remove();
    editButton.remove();
    attachButton.remove();
    cancelButton.remove();
    inputEl.remove();
    inputContainerEl.remove();
    (chatbar as any) = null;
    (sendButton as any) = null;
    (editButton as any) = null;
    (attachButton as any) = null;
    (cancelButton as any) = null;
    (inputEl as any) = null;
    (inputContainerEl as any) = null;
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
