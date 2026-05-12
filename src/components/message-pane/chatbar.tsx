import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Button } from "../button";
import { Input } from "../input";

const chatbarContainer = css`
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
  const chatbar = (
    <div class={chatbarContainer}>
      <Input
        class="chatInput"
        suffix={
          <>
            <Button class="button" icon="send" hoverBorder />
          </>
        }
      />
    </div>
  ) as unknown as HTMLElement;

  const render = () => chatbar;

  const updatePlaceholder = () => {
    const input = chatbar.querySelector(".chatInput input") as HTMLInputElement;
    input.placeholder = t`Message in ${channelStore.currentChannel()?.name!}`;
  };

  const channelIdUnsub = storeEmitter.on("navigate:channelId", () => {
    updatePlaceholder();
  });

  const authenticatedUnsub = storeEmitter.on("user:authenticated", () => {
    updatePlaceholder();
  });

  const destroy = () => {
    channelIdUnsub();
    authenticatedUnsub();
    chatbar.remove();
  };

  return { render, destroy };
};
