import { css } from "@linaria/core";

import { h } from "../../h";
import type { Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { convertShorthandToLinearGradient } from "../../utils/color";
import { friendlyTimestamp } from "../../utils/date";
import { buildImageUrl, constrainDimensions } from "../../utils/image";
import { throttle } from "../../utils/throttle";
import { Avatar } from "../avatar";
import { CdnIcon } from "../cdnIcon";
import { GradientText } from "../gradientText";
import { Markup } from "../markup/markup";
import { ServerClanItem } from "../serverClanItem";
import { Skeleton } from "../skeleton";
import { shouldGroup } from "./utils";

const messageItem = css`
  display: flex;
  gap: 10px;
  padding-left: 8px;
  padding-right: 8px;
  flex-shrink: 0;
  overflow: hidden;

  &:hover {
    background-color: var(--gray-800);
  }
  &.sending {
    opacity: 0.6;
  }
  &.error {
    color: var(--alert-color);
  }

  .details {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    .timestamp {
      font-size: 12px;
      color: var(--gray-400);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .roleIcon {
      background-color: transparent;
    }
  }

  &.withDetails {
    margin-top: 10px;
  }
  .username {
    font-weight: 500;
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
  }
  .avatarPlaceholder {
    width: 40px;
    flex-shrink: 0;
    height: 1px;
  }
  .content {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .messageBody {
    min-width: 0;
    overflow: hidden;
  }
`;
export const MessageItem = (props: {
  message: Message;
  prevMessage?: Message;
  container: HTMLDivElement;
}) => {
  const creator = props.message.createdBy;
  const group =
    props.prevMessage && shouldGroup(props.message, props.prevMessage);

  const member = serverMemberStore.serverMembers
    .get(serverStore.currentServerId!)
    ?.get(creator.id);

  const topRole = serverStore.memberTopColorAndIcon(member);
  const color =
    convertShorthandToLinearGradient(topRole?.color) ?? topRole?.color ?? "";

  const name = member?.nickname || creator.username;

  return (
    <div
      class={[messageItem, !group && "withDetails", props.message.state]}
      data-message-id={props.message.id}
      data-grouped={group}
    >
      {group ? (
        <div class="avatarPlaceholder"></div>
      ) : (
        <Avatar user={creator} size={40} />
      )}
      <div class="messageBody">
        {!group && (
          <span class="details">
            <GradientText class="username" color={color}>
              {name}
            </GradientText>
            {creator?.profile?.clan && (
              <ServerClanItem clan={creator.profile.clan} />
            )}
            {topRole?.icon && (
              <CdnIcon
                class="roleIcon"
                role={{ icon: topRole.icon }}
                size={14}
              />
            )}
            <span class="timestamp">
              {friendlyTimestamp(props.message.createdAt)}
            </span>
          </span>
        )}
        <div class="content">
          <Markup text={props.message.content} message={props.message} />
          <MessageEmbeds message={props.message} container={props.container} />
        </div>
      </div>
    </div>
  );
};

const imageContainer = css`
  width: var(--width);
  height: var(--height);
  border-radius: var(--radius-8);
  overflow: hidden;
  position: relative;
  .image {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    &.loaded {
      opacity: 1;
    }
  }
  .skeleton {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
  }
`;
export const MessageEmbeds = (props: {
  message: Message;
  container: HTMLDivElement;
}) => {
  const attachment = props.message.attachments[0];
  const imageAttachment =
    attachment?.width != undefined &&
    attachment?.mime?.startsWith("image/") == true;

  if (imageAttachment) {
    const cached = attachment.cached;
    const [url, _] = buildImageUrl(attachment?.path!);
    const img = (
      <img src={url} loading="lazy" class={"image"} />
    ) as HTMLImageElement;
    if (cached) img.classList.add("loaded");
    const maxWidth = clamp(props.container.clientWidth - 70, 600);

    const maxHeight = props.container.clientHeight / 2;

    const skeleton = cached
      ? null
      : ((<Skeleton class="skeleton" />) as HTMLDivElement);
    img.onload = !cached
      ? () => {
          attachment.cached = true;
          skeleton?.remove();
          img.classList.add("loaded");
          img.onload = null;
        }
      : null;

    const dims = constrainDimensions({
      width: attachment.width!,
      height: attachment.height!,
      maxWidth,
      maxHeight,
    });

    return (
      <div
        class={[imageContainer]}
        data-width={attachment.width}
        data-height={attachment.height}
        style={{ "--width": dims.width, "--height": dims.height }}
      >
        {skeleton}
        {img}
      </div>
    );
  }
  return null;
};

export const createImageEmbedResizer = (logElement: HTMLDivElement) => {
  const onResize = throttle(() => {
    const imageEmbeds = logElement.querySelectorAll(`.${imageContainer}`);
    const maxWidth = clamp(logElement.clientWidth - 70, 600);
    const maxHeight = logElement.clientHeight / 2;

    for (let i = 0; i < imageEmbeds.length; i++) {
      const embedEl = imageEmbeds[i] as HTMLDivElement;

      const imgWidth = parseInt(embedEl.dataset.width!);
      const imgHeight = parseInt(embedEl.dataset.height!);

      const dims = constrainDimensions({
        width: imgWidth,
        height: imgHeight,
        maxWidth,
        maxHeight,
      });

      embedEl.style.setProperty("--width", dims.width);
      embedEl.style.setProperty("--height", dims.height);
    }
  }, 20);

  window.addEventListener("resize", onResize);
  const destroy = () => {
    window.removeEventListener("resize", onResize);
  };

  return {
    destroy,
  };
};

function clamp(num: number, max: number) {
  return num >= max ? max : num;
}
