import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { messageStore } from "../../store/messageStore";
import { userStore } from "../../store/userStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Button } from "../button";
import { Input } from "../input";

const chatbarContainer = css`
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  const chatbar = (
    <div class={chatbarContainer}>
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

  const sendMessage = () => {
    input.focus();
    const value = input.value.trim();
    if (!value) return;
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

  storeEmitter.on("navigate:channelId", updatePlaceholder, signal);

  storeEmitter.on("ws:authStateUpdate", updatePlaceholder, signal);
  storeEmitter.on("ws:connectStateUpdate", updatePlaceholder, signal);

  const destroy = () => {
    chatbar.remove();
    abortController.abort();
  };

  return { render, destroy };
};
