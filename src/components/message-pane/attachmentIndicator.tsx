import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { prettyBytes } from "../../utils/file";
import { Icon } from "../icon";

import style from "./attachmentIndicator.module.css";

export const createAttachmentIndicator = (signal: AbortSignal) => {
  let container = (
    <div class={[style.attachmentIndicator, style.hide]}></div>
  ) as HTMLDivElement;

  const rerender = () => {
    const channelProperty = channelStore.currentChannelProperty();
    const attachment = channelProperty?.attachment;
    if (!attachment) {
      container.replaceChildren();
      container.classList.add(style.hide!);
      return;
    }
    const file = attachment.file;

    container.replaceChildren(
      <>
        {!attachment.image && <Icon class={style.icon} name="upload_file" />}
        {attachment.image && (
          <img class={style.preview} src={attachment.image.src} />
        )}
        <div class={style.details}>
          <div>{file.name}</div>
          <div class={style.size}>{prettyBytes(file.size)}</div>
        </div>
      </>,
    );
    container.classList.remove(style.hide!);
  };

  storeEmitter.on("message_property:attachment", rerender, signal);
  storeEmitter.on("navigate:channelId", rerender, signal);
  rerender();

  signal.addEventListener(
    "abort",
    () => {
      container.remove();
      (container as any) = null;
    },
    { once: true },
  );

  return container;
};