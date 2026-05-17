import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import type { Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import type { RawReplyMessage } from "../../Types";
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
  flex-direction: column;
  padding-left: 4px;
  margin-left: 4px;
  margin-right: 4px;
  flex-shrink: 0;
  border-radius: var(--radius-6);
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
  .messageContainer {
    display: flex;
    gap: 10px;
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
    margin-top: 6px;
    padding-top: 4px;
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

  const hasMessageReplies = !!props.message.replyMessages?.length;

  return (
    <div
      class={[
        "messageItem",
        messageItem,
        !group && "withDetails",
        props.message.state,
      ]}
      data-message-id={props.message.id}
      data-grouped={group}
    >
      {hasMessageReplies && <MessageReplies message={props.message} />}
      <div class="messageContainer">
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
            <MessageEmbeds
              message={props.message}
              container={props.container}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageEmbeds = (props: {
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

const messageReplies = css`
  display: flex;
  margin-bottom: 8px;
  .arc {
    width: 50px;
    flex-shrink: 0;
    position: relative;
    &::before {
      content: "";
      position: absolute;
      top: 8px;
      left: 20px;
      width: 20px;
      height: calc(100% - 8px);
      border-left: 2.5px solid var(--gray-600);
      border-top: 2.5px solid var(--gray-600);
      border-top-left-radius: 6px;
    }
  }
  .replies {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
    flex: 1;
  }
`;

const MessageReplies = (props: { message: Message }) => {
  const replies = props.message.replyMessages!;
  return (
    <div class={messageReplies}>
      <div class="arc"></div>
      <div class="replies">
        {replies.map((reply) => (
          <ReplyMessage message={reply} />
        ))}
      </div>
    </div>
  );
};

const replyMessage = css`
  display: flex;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  .username {
    font-weight: 500;
    opacity: 0.8;
    flex-shrink: 0;
  }
  .deleted {
    opacity: 0.4;
  }
  .content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ReplyMessage = (props: { message: RawReplyMessage }) => {
  const message = props.message.replyToMessage;
  const creator = message?.createdBy!;
  const member = serverMemberStore.serverMembers
    .get(serverStore.currentServerId!)
    ?.get(creator?.id);
  const topRoleColor = serverStore.memberTopColor(member);

  const color =
    convertShorthandToLinearGradient(topRoleColor) ?? topRoleColor ?? "";

  return (
    <div class={replyMessage}>
      {message ? (
        <>
          <GradientText class="username" color={color}>
            {creator.username}
          </GradientText>
          <span class="content">{message?.content}</span>
        </>
      ) : (
        <span class="content deleted">{t`Message was deleted.`}</span>
      )}
    </div>
  );
};
