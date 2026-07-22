import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import { userStore } from "../../store/userStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Avatar } from "../avatar";

import style from "./selectedCommandIndicator.module.css";

export const createSelectedCommandIndicator = (signal: AbortSignal) => {
  let editMessageContainer = (
    <div class={[style.selectedBotCommand, style.hide]}></div>
  ) as HTMLDivElement;

  const rerender = () => {
    const item = channelStore.currentChannelProperty()?.selectedBotCommand;
    if (!item) {
      editMessageContainer.classList.add(style.hide!);
      return editMessageContainer.replaceChildren();
    }

    const botUser = userStore.users.get(item.botUserId!);

    editMessageContainer.replaceChildren(
      <>
        <div class={style.icon}>
          {botUser ? <Avatar user={botUser} size={32} /> : undefined}
        </div>
        <div>
          <div>
            /{item.name}{" "}
            {item.args && <span class={style.args}>{item.args}</span>}
          </div>
          {item.description && (
            <div class={style.description}>{item.description}</div>
          )}
        </div>
      </>,
    );
    editMessageContainer.classList.remove(style.hide!);
  };

  storeEmitter.on("message_property:select_bot_command", rerender, signal);
  storeEmitter.on("navigate:channelId", rerender, signal);
  rerender();

  signal.addEventListener(
    "abort",
    () => {
      editMessageContainer.remove();
      (editMessageContainer as any) = null;
    },
    { once: true },
  );

  return editMessageContainer;
};
