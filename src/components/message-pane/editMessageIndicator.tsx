import { h } from "../../h";
import { channelStore } from "../../store/channelStore";
import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Icon } from "../icon";
import { Markup } from "../markup/markup";

import style from "./editMessageIndicator.module.css";

export const createEditMessageIndicator = (signal: AbortSignal) => {
  let textEl = (<div class={style.text}></div>) as HTMLDivElement;
  let editMessageContainer = (
    <div class={[style.editMessageIndicator, style.hide]}>
      <Icon class={style.icon} name="edit" />
      {textEl}
    </div>
  ) as HTMLDivElement;

  const rerender = () => {
    const currentChannelId = channelStore.currentChannelId;
    const channelProperty = channelStore.getProperty(currentChannelId!);
    const message = channelProperty?.editingMessage;
    if (!message) {
      textEl.replaceChildren();
      editMessageContainer.classList.add(style.hide!);
      return;
    }
    const serverId = serverStore?.currentServerId;
    textEl.replaceChildren(
      <Markup
        text={message.content || ""}
        message={message}
        serverId={serverId}
        class={style.markup}
        inline
      />,
    );
    editMessageContainer.classList.remove(style.hide!);
  };

  storeEmitter.on("message_property:editing", rerender, signal);
  storeEmitter.on("navigate:channelId", rerender, signal);
  rerender();

  signal.addEventListener(
    "abort",
    () => {
      textEl.remove();
      editMessageContainer.remove();
      (textEl as any) = null;
      (editMessageContainer as any) = null;
    },
    { once: true },
  );

  return editMessageContainer;
};
