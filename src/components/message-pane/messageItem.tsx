import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import type { Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import type { RawReplyMessage } from "../../Types";
import { convertShorthandToLinearGradient } from "../../utils/color";
import { scoped } from "../../utils/css";
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
  .${scoped`messageContainer`} {
    display: flex;
    gap: 10px;
  }

  .${scoped`details`} {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    margin-bottom: 2px;
    .${scoped`timestamp`} {
      font-size: 12px;
      color: var(--gray-400);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .${scoped`roleIcon`} {
      padding: 0;
      background-color: transparent;
    }
  }
  padding-top: 2px;
  padding-bottom: 2px;
  &.withDetails {
    margin-top: 8px;
  }
  .${scoped`username`} {
    font-weight: 500;
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
  }
  .${scoped`avatarPlaceholder`} {
    width: 40px;
    flex-shrink: 0;
    height: 1px;
  }
  .${scoped`content`} {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .${scoped`messageBody`} {
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
      <div class={scoped`messageContainer`}>
        {group ? (
          <div class={scoped`avatarPlaceholder`}></div>
        ) : (
          <Avatar user={creator} size={40} />
        )}
        <div class={scoped`messageBody`}>
          {!group && (
            <span class={scoped`details`}>
              <GradientText class={scoped`username`} color={color}>
                {name}
              </GradientText>
              {creator?.profile?.clan && (
                <ServerClanItem clan={creator.profile.clan} />
              )}
              {topRole?.icon && (
                <CdnIcon
                  class={scoped`roleIcon`}
                  role={{ icon: topRole.icon }}
                  size={14}
                />
              )}
              <span class={scoped`timestamp`}>
                {friendlyTimestamp(props.message.createdAt)}
              </span>
            </span>
          )}
          <div class={scoped`content`}>
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
  .${scoped`arc`} {
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
  .${scoped`replies`} {
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
      <div class={scoped`arc`}></div>
      <div class={scoped`replies`}>
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
  .${scoped`username`} {
    font-weight: 500;
    opacity: 0.8;
    flex-shrink: 0;
  }
  &.deleted {
    opacity: 0.4;
  }
  .${scoped`content`} {
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
          <GradientText class={scoped`username`} color={color}>
            {creator.username}
          </GradientText>
          <span class={scoped`content`}>{message?.content}</span>
        </>
      ) : (
        <span class={`${replyMessage} deleted`}>{t`Message was deleted.`}</span>
      )}
    </div>
  );
};
