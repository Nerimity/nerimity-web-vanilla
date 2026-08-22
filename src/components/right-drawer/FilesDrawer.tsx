import { getAttachments } from "../../services/channelService";
import { channelStore } from "../../store/channelStore";
import type { FullAttachment } from "../../Types";
import { fullDate } from "../../utils/date";
import { buildImageUrl } from "../../utils/image";
import { Icon } from "../icon";
import { Link } from "../link";

import style from "./FilesDrawer.module.css";

const AttachmentItem = (props: { attachment: FullAttachment }) => {
  const isImage = !!props.attachment.width || !!props.attachment.height;

  const [attachmentUrl] = buildImageUrl(props.attachment.path, { size: 300 });

  const messageId = props.attachment.messageId!;

  return (
    <Link
      href={location.pathname + "?messageId=" + messageId}
      class={style.item}
    >
      <div class={style.overlay}>
        <Icon name="visibility" class={style.icon} />
      </div>
      {isImage && attachmentUrl ? (
        <img class={style.image} src={attachmentUrl} />
      ) : (
        <Icon name="attach_file" class={style.icon} />
      )}
    </Link>
  );
};

export const createFilesDrawer = () => {
  let filesContainerEl = (
    <div class={style.container}></div>
  ) as HTMLDivElement;

  const render = () => {
    return filesContainerEl;
  };

  const loadAttachments = async () => {
    const channelId = channelStore.currentChannelId!;
    const [attachments] = await getAttachments(channelId);

    if (!attachments) return;

    const categorized: FullAttachment[][] = [];
    let index = -1;

    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i]!;
      if (isNewDay(attachment, attachments[i - 1])) {
        index++;
        categorized[index] = [];
      }
      categorized[index]?.push(attachment);
    }

    filesContainerEl.replaceChildren(
      <>
        {categorized.map((category) => (
          <div class={style.category}>
            <div class={style.marker}>
              <span>{fullDate(category[0]?.createdAt || 0)}</span>
              <div class={style.line} />
            </div>
            <div class={style.categoryItems}>
              {category.map((attach) => (
                <AttachmentItem attachment={attach} />
              ))}
            </div>
          </div>
        ))}
      </>,
    );
  };

  loadAttachments();

  const destroy = () => {
    filesContainerEl.remove();
    (filesContainerEl as any) = null;
  };

  return {
    destroy,
    render,
  };
};

const MS_PER_DAY = 86400000;
const TZ_OFFSET = new Date().getTimezoneOffset() * 60000;

const dayNumber = (ts: number) => Math.floor((ts - TZ_OFFSET) / MS_PER_DAY);

const isNewDay = (attach: FullAttachment, prev?: FullAttachment) => {
  if (!prev) return true;
  return dayNumber(attach.createdAt) !== dayNumber(prev.createdAt);
};
