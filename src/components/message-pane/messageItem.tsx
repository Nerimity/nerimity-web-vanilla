import { css } from "@linaria/core";

import { h, Fragment } from "../../h";
import type { Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { convertShorthandToLinearGradient } from "../../utils/color";
import { friendlyTimestamp } from "../../utils/date";
import { buildImageUrl, constrainDimensions } from "../../utils/image";
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
    .timestamp {
      font-size: 12px;
      color: var(--gray-400);
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
      <div>
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
  .image {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    width: 100%;
    height: 100%;
    &.loaded {
      opacity: 1;
    }
  }
  .skeleton {
    width: 100%;
    height: 100%;
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
    const maxWidth = Math.min(
      Math.max(props.container.clientWidth - 100, 0),
      1920,
    );
    const maxHeight = Math.min(
      Math.max(props.container.clientHeight / 2, 0),
      600,
    );
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
        style={{ "--width": dims.width, "--height": dims.height }}
      >
        {skeleton}
        {img}
      </div>
    );
  }
  return null;
};
