import { css } from "@linaria/core";

import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { prettyBytes } from "../../utils/file";
import { Icon } from "../icon";

const attachmentIndicator = css`
  display: flex;
  gap: 6px;
  border-radius: var(--radius-8);
  background: var(--gray-900);
  border: solid 1px var(--gray-600);
  margin-top: 4px;
  padding: 6px;
  padding-right: 8px;
  color: var(--text-color);
  align-self: start;
  align-items: center;
  font-size: 14px;
  max-width: 100%;
  overflow: hidden;
  .icon {
    color: var(--primary-color);
    font-size: 32px;
  }

  .details {
    .name {
    }
    .size {
      color: var(--gray-400);
    }
  }

  .preview {
    overflow: hidden;
    border-radius: var(--radius-4);
    height: 80px;
    max-width: 300px;
    object-fit: contain;
    aspect-ratio: 16/9;
    background: var(--gray-800);
    margin-right: 6px;
    border: solid 1px var(--gray-600);
  }

  &.hide {
    display: none;
  }
`;

export const createAttachmentIndicator = (signal: AbortSignal) => {
  const container = (
    <div class={[attachmentIndicator, "hide"]}></div>
  ) as HTMLDivElement;

  const rerender = () => {
    const channelProperty = channelStore.currentChannelProperty();
    const attachment = channelProperty?.attachment;
    if (!attachment) {
      container.replaceChildren();
      container.classList.add("hide");
      return;
    }
    const file = attachment.file;

    container.replaceChildren(
      <>
        {!attachment.image && <Icon class="icon" name="upload_file" />}
        {attachment.image && <img class="preview" src={attachment.image.src} />}
        <div class="details">
          <div class="name">{file.name}</div>
          <div class="size">{prettyBytes(file.size)}</div>
        </div>
      </>,
    );
    container.classList.remove("hide");
  };

  storeEmitter.on("message_property:attachment", rerender, signal);
  storeEmitter.on("navigate:channelId", rerender, signal);
  rerender();

  return container;
};
