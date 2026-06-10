import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h } from "../../h";
import { postTyping } from "../../services/channelService";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { messageStore } from "../../store/messageStore";
import { userStore } from "../../store/userStore";
import { MessageType } from "../../Types";
import { scoped } from "../../utils/css";
import { storeEmitter } from "../../utils/EventEmitter";
import { Button } from "../button";
import { Input } from "../input";
import { createEditMessageIndicator } from "./editMessageIndicator";
import { createJumpToPresent } from "./JumpToPresent";
import { createRepliesIndicator } from "./repliesIndicator";
import { createTypingIndicator } from "./typingIndicator";

const chatbarContainer = css`
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  padding-top: 0;
  z-index: 9999999999999;
  .chatInput {
  }
  .buttons {
    margin: 4px;
    display: flex;
    gap: 4px;
  }
  .${scoped`button`} {
    width: 50px;
    padding: 6px 0;
    border-radius: var(--radius-4);
    .icon {
      font-size: 20px;
    }
    &.hide {
      display: none;
    }
  }
`;

const chatInputContainer = css`
  display: flex;
  flex-direction: column;
  position: relative;
`;

export const createChatbar = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const typingIndicator = createTypingIndicator(abortController);
  const editMessageIndicator = createEditMessageIndicator(signal);
  const repliesIndicator = createRepliesIndicator(abortController);
  const jumpToPresent = createJumpToPresent({ signal });

  const sendButton = (
    <Button class={[scoped`button`, "send"]} icon="send" hoverBorder />
  ) as HTMLElement;
  const editButton = (
    <Button class={[scoped`button`, "edit", "hide"]} icon="edit" hoverBorder />
  ) as HTMLElement;

  const chatbar = (
    <div class={chatbarContainer}>
      {typingIndicator.el}
      {editMessageIndicator}
      {repliesIndicator}
      <div class={chatInputContainer}>
        {jumpToPresent}
        <Input
          class="chatInput"
          suffix={
            <div class="buttons">
              {sendButton}
              {editButton}
            </div>
          }
        />
      </div>
    </div>
  ) as unknown as HTMLElement;
  const input = chatbar.querySelector(".chatInput input") as HTMLInputElement;

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
    if (!value) return;
    property.content = "";
    input.value = "";

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
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      sendMessage();
      return;
    }
    if (event.key === "Escape") {
      const channelId = channelStore.currentChannelId!;
      channelStore.setEditingMessage(channelId, undefined);

      return;
    }
    if (event.key === "ArrowUp") {
      const channelId = channelStore.currentChannelId!;
      const property = channelStore.currentChannelProperty();
      if (property?.content.trim()) {
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

  input.addEventListener("keydown", handleKeyDown, { signal });
  input.addEventListener("input", handleInput, { signal });

  sendButton.addEventListener("click", sendMessage, { signal });

  const render = () => {
    updatePlaceholder();
    return chatbar;
  };

  const updatePlaceholder = () => {
    const input = chatbar.querySelector(".chatInput input") as HTMLInputElement;
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

    sendButton.classList.toggle("hide", isEditing);
    editButton.classList.toggle("hide", !isEditing);
  };

  storeEmitter.on(
    "navigate:channelId",
    () => {
      lastInputAt = 0;

      syncValue();
      updatePlaceholder();
    },
    signal,
  );
  storeEmitter.on(
    "message_property:replying",
    () => {
      input.focus();
    },
    signal,
  );
  storeEmitter.on(
    "message_property:editing",
    () => {
      syncValue();
      input.focus();
    },
    signal,
  );

  storeEmitter.on("ws:authStateUpdate", updatePlaceholder, signal);
  storeEmitter.on("ws:connectStateUpdate", updatePlaceholder, signal);

  const destroy = () => {
    chatbar.remove();
    abortController.abort();
  };

  return { render, destroy, jumpToPresentButton: jumpToPresent };
};
