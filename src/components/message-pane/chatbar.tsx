import { css } from "@linaria/core";

import { h } from "../../h";
import { channelStore } from "../../store/channelStore";
import { storeEmitter } from "../../utils/EventEmitter";

const inputContainer = css`
  display: flex;
  align-items: center;

  background-color: var(--input-background-color);
  border: solid 1px var(--gray-700);
  border-radius: var(--radius-6);
  overflow: hidden;
  transition: 0.2s border-bottom-color;
  &:has(input:focus) {
    border-bottom-color: var(--primary-color);
  }
  input {
    padding: 8px;
    color: var(--text-color);
    outline: none;
    border: none;
    background: transparent;
    width: 100%;
  }
`;

interface InputProps {
  class?: string | string[];
}
const Input = (props: InputProps) => {
  return (
    <div class={[inputContainer, props.class]}>
      <input type="text" />
      <button>test</button>
    </div>
  );
};

const chatbarContainer = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
`;

export const createChatbar = () => {
  const chatbar = (
    <div class={chatbarContainer}>
      <Input class="chatInput" />
    </div>
  ) as unknown as HTMLElement;

  const render = () => chatbar;

  const channelIdUnsub = storeEmitter.on("navigate:channelId", () => {
    const input = chatbar.querySelector(".chatInput input") as HTMLInputElement;
    input.placeholder = `#${channelStore.currentChannel()?.name}`;
  });

  const destroy = () => {
    channelIdUnsub();
    chatbar.remove();
  };

  return { render, destroy };
};
