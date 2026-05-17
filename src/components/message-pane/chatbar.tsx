import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import { messageStore } from "../../store/messageStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Button } from "../button";
import { Input } from "../input";

const chatbarContainer = css`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  padding-top: 0;
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
    input.placeholder = t`Message in ${channelStore.currentChannel()?.name!}`;
  };

  storeEmitter.on(
    "navigate:channelId",
    () => {
      updatePlaceholder();
    },
    signal,
  );

  storeEmitter.on(
    "user:authenticated",
    () => {
      updatePlaceholder();
    },
    signal,
  );

  const destroy = () => {
    chatbar.remove();
    abortController.abort();
  };

  return { render, destroy };
};
