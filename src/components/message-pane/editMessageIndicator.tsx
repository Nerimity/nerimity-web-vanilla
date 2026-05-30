import { css } from "@linaria/core";

import { h } from "../../h";
import { channelStore } from "../../store/channelStore";
import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Icon } from "../icon";
import { Markup } from "../markup/markup";

const editMessageIndicator = css`
  display: flex;
  gap: 4px;
  border-radius: var(--radius-max);
  background: var(--gray-900);
  border: solid 1px var(--gray-600);
  margin-top: 4px;
  padding: 2px;
  padding-right: 8px;
  color: var(--text-color);
  align-self: start;
  align-items: center;
  font-size: 12px;
  height: 22px;
  max-width: 100%;
  overflow: hidden;
  .icon {
    color: var(--primary-color);
    font-size: 16px;
    margin-left: 4px;
  }
  .text {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    opacity: 0.8;
  }
  &.hide {
    display: none;
  }
`;

export const createEditMessageIndicator = (signal: AbortSignal) => {
  const textEl = (<div class="text"></div>) as HTMLDivElement;
  const editMessageContainer = (
    <div class={[editMessageIndicator, "hide"]}>
      <Icon class="icon" name="edit" />
      {textEl}
    </div>
  ) as HTMLDivElement;

  signal.addEventListener("abort", () => {}, { once: true });

  const rerender = () => {
    const currentChannelId = channelStore.currentChannelId;
    const channelProperty = channelStore.getProperty(currentChannelId!);
    const message = channelProperty?.editingMessage;
    if (!message) {
      textEl.replaceChildren();
      editMessageContainer.classList.add("hide");
      return;
    }
    const serverId = serverStore?.currentServerId;
    textEl.replaceChildren(
      <Markup
        text={message.content}
        message={message}
        serverId={serverId}
        inline
      />,
    );
    editMessageContainer.classList.remove("hide");
  };

  storeEmitter.on("message:editing", rerender, signal);
  storeEmitter.on("navigate:channelId", rerender, signal);
  rerender();

  return editMessageContainer;
};
