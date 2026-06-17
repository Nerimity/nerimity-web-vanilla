import { cdnUrl } from "../../config";
import { h } from "../../h";
import type { AttachmentProperty } from "../../store/channelStore";
import type { LocalAttachment } from "../../store/messageStore";
import { formatExpiry } from "../../utils/date";
import { prettyBytes } from "../../utils/file";
import { getFilenameFromPath, safeDecodeURIComponent } from "../../utils/url";
import { Button } from "../button";
import { Icon } from "../icon";

import style from "./FileEmbed.module.css";

export const FileEmbed = (props: {
  attachment?: LocalAttachment;
  attachmentProperty?: AttachmentProperty;
}) => {
  const name =
    props.attachmentProperty?.file.name ||
    safeDecodeURIComponent(getFilenameFromPath(props.attachment?.path!));

  const size =
    props.attachmentProperty?.file.size || props.attachment?.filesize || 0;

  const expireAt = props.attachment?.expireAt;
  const expired = expireAt && Date.now() > expireAt;

  const downloadUrl = props.attachment?.path
    ? cdnUrl + props.attachment?.path
    : undefined;

  return (
    <div class={[style.fileEmbed, "fileEmbed"]}>
      <div class={style.content}>
        <Icon outlined class={style.icon} name="draft" />
        <div class={style.details}>
          <div>{name}</div>
          <div class={style.sub}>
            <span>{prettyBytes(size)}</span>
            {expireAt && (
              <span class={style.expires} data-expired={expired}>
                <Icon outlined class={style.expiresIcon} name="schedule" />
                {formatExpiry(expireAt)}
              </span>
            )}
          </div>
        </div>
        {downloadUrl && !expired && (
          <Button
            component="a"
            target="_blank"
            rel="noopener noreferrer"
            class={style.button}
            icon="download"
            hoverBorder
            href={downloadUrl}
          />
        )}
      </div>
      {props.attachmentProperty && (
        <div class={[style.progressContainer, "progressContainer"]}>
          <div class={style.progressDetails}>
            <div class="percent">0%</div>
            <div class="speed">0 KB/s</div>
          </div>
          <div class={style.progressBar}>
            <div class={[style.bar, "bar"]}></div>
          </div>
        </div>
      )}
    </div>
  );
};
