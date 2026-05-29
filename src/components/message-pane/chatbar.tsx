import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import { postTyping } from "../../services/channelService";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { messageStore } from "../../store/messageStore";
import { userStore } from "../../store/userStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Button } from "../button";
import { Input } from "../input";
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
  .button {
    width: 50px;
    margin: 4px;
    padding: 6px 0;
    border-radius: var(--radius-4);
    .icon {
      font-size: 20px;
    }
  }
`;

export const createChatbar = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const typingIndicator = createTypingIndicator(abortController);

  const chatbar = (
    <div class={chatbarContainer}>
      {typingIndicator.el}
      <Input
        class="chatInput"
        suffix={
          <>
            <Button class="button send" icon="send" hoverBorder />
          </>
        }
      />
    </div>
  ) as unknown as HTMLElement;
  const input = chatbar.querySelector(".chatInput input") as HTMLInputElement;
  const sendButton = chatbar.querySelector(".button.send") as HTMLButtonElement;

  let lastInputAt = 0;
  const handleInput = () => {
    const property = channelStore.getProperty(channelStore.currentChannelId!)!;
    property.content = input.value.trim();
    if (lastInputAt >= Date.now() - 4000) {
      return;
    }
    lastInputAt = Date.now();
    postTyping(channelStore.currentChannel()!.id);
  };

  const sendMessage = () => {
    lastInputAt = 0;
    const property = channelStore.getProperty(channelStore.currentChannelId!)!;
    input.focus();
    const value = input.value.trim();
    if (!value) return;
    property.content = "";
    input.value = "";
    messageStore.sendMessage(channelStore.currentChannel()!.id, {
      content: value,
    });
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      sendMessage();
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

  storeEmitter.on(
    "navigate:channelId",
    () => {
      lastInputAt = 0;

      const property = channelStore.getProperty(
        channelStore.currentChannelId!,
      )!;
      input.value = property.content || "";
      updatePlaceholder();
    },
    signal,
  );

  storeEmitter.on("ws:authStateUpdate", updatePlaceholder, signal);
  storeEmitter.on("ws:connectStateUpdate", updatePlaceholder, signal);

  const destroy = () => {
    chatbar.remove();
    abortController.abort();
  };

  return { render, destroy };
};
