import { css } from "@linaria/core";

import { h } from "../../h";
import type { Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { convertShorthandToLinearGradient } from "../../utils/color";
import { friendlyTimestamp } from "../../utils/date";
import { Avatar } from "../avatar";
import { CdnIcon } from "../cdnIcon";
import { GradientText } from "../gradientText";
import { Markup } from "../markup/markup";
import { ServerClanItem } from "../serverClanItem";
import { ImageEmbed } from "./imageEmbed";
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

  const isImageEmbedOnly =
    props.message.embed?.type == "image" &&
    !props.message.content.includes(" ");

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
          {!isImageEmbedOnly && (
            <Markup text={props.message.content} message={props.message} />
          )}
          <MessageEmbeds message={props.message} container={props.container} />
        </div>
      </div>
    </div>
  );
};

export const MessageEmbeds = (props: {
  message: Message;
  container: HTMLDivElement;
}) => {
  const attachment = props.message.attachments[0];
  const imageAttachment =
    attachment?.width != undefined &&
    attachment?.mime?.startsWith("image/") == true;

  const imageEmbed =
    props.message.embed?.type == "image" &&
    props.message.embed?.imageHeight != null;

  if (imageAttachment || imageEmbed) {
    return (
      <ImageEmbed
        attachment={attachment}
        embed={props.message.embed}
        container={props.container}
      />
    );
  }
  return null;
};
