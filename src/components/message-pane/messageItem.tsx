import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import { friendStore } from "../../store/friendStore";
import { type Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { userStore } from "../../store/userStore";
import { MessageType, type RawReplyMessage } from "../../Types";
import { convertShorthandToLinearGradient } from "../../utils/color";
import { friendlyTimestamp, fullDate } from "../../utils/date";
import { Avatar } from "../avatar";
import { CdnIcon } from "../cdnIcon";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Link } from "../link";
import { Markup } from "../markup/markup";
import { ServerClanItem } from "../serverClanItem";
import { FileEmbed } from "./FileEmbed";
import { ImageEmbed } from "./imageEmbed";
import { MessageReactions } from "./MessageReactions";
import { OGEmbed } from "./OGEmbed";
import { SystemMessage } from "./SystemMessage";
import { isNewDay, isNewUser, shouldGroup } from "./utils";

import style from "./messageItem.module.css";

const Marker = (props: { alert?: boolean; label?: string }) => {
  return (
    <div class={style.marker} data-alert={props.alert}>
      <span>{props.label}</span>
      <div class={style.line} />
    </div>
  );
};

export const MessageItem = (props: {
  message: Message;
  prevMessage?: Message;
  newMarker?: boolean;
  container: HTMLDivElement;
  hideNewDayMarker?: boolean;
}) => {
  const creator = props.message.createdBy;
  const cachedCreator = userStore.users.get(creator.id);

  const channelProperty = channelStore.currentChannelProperty();
  const newDay =
    !props.hideNewDayMarker && isNewDay(props.message, props.prevMessage);

  const group =
    !newDay &&
    !props.newMarker &&
    props.prevMessage &&
    shouldGroup(props.message, props.prevMessage);

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
  const editing = channelProperty?.editingMessage?.id === props.message.id;

  const isContentMessage = props.message.type === MessageType.CONTENT;

  const someoneMentioned = props.message.content?.includes("[@:s]");

  const isFriendBlocked =
    !props.message.showBlocked && friendStore.isFriendBlocked(creator.id);

  return (
    <div data-message-id={props.message.id} data-grouped={group}>
      {newDay && <Marker label={fullDate(props.message.createdAt)} />}
      {props.newMarker && <Marker alert label={t`New Messages`} />}
      {isFriendBlocked && (
        <div class={style.blocked} data-blocked>
          You have blocked this user. Click to show.
        </div>
      )}
      {!isFriendBlocked && (
        <div
          class={[
            "messageItem",
            style.messageItem,
            !group && style.withDetails,
            props.message.state,
            editing && style.editing,
            someoneMentioned && style.someoneMentioned,
          ]}
        >
          {!isContentMessage && <SystemMessage message={props.message} />}
          {isContentMessage && (
            <>
              {hasMessageReplies && <MessageReplies message={props.message} />}
              <div class={[style.messageContainer, "messageContainer"]}>
                {group ? (
                  <div class={style.avatarPlaceholder}></div>
                ) : (
                  <Link href={`/app/profile/${creator.id}`}>
                    <Avatar user={creator} size={40} />
                  </Link>
                )}
                <div class={style.messageBody}>
                  {!group && (
                    <span class={style.details}>
                      <GradientText
                        tag={Link}
                        decoration
                        href={`/app/profile/${creator.id}`}
                        class={style.username}
                        color={color}
                      >
                        {name}
                      </GradientText>
                      {isNewUser(cachedCreator) && (
                        <Icon
                          class={style.newUserIcon}
                          name="deceased"
                          title={t`New to Nerimity`}
                        />
                      )}
                      {creator?.profile?.clan && (
                        <ServerClanItem clan={creator.profile.clan} />
                      )}
                      {topRole?.icon && (
                        <CdnIcon
                          class={style.roleIcon}
                          role={{ icon: topRole.icon }}
                          size={14}
                        />
                      )}
                      <span class={style.timestamp}>
                        {friendlyTimestamp(props.message.createdAt)}
                      </span>
                    </span>
                  )}
                  <div class={style.content}>
                    {!isImageEmbedOnly && (
                      <Markup
                        text={props.message.content}
                        message={props.message}
                      />
                    )}
                    <MessageEmbeds
                      message={props.message}
                      container={props.container}
                    />
                  </div>
                  <MessageReactions message={props.message} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const MessageEmbeds = (props: {
  message: Message;
  container: HTMLDivElement;
}) => {
  const attachment = props.message.attachments[0];

  const embed = props.message.embed;

  const imageAttachment =
    attachment?.width != undefined &&
    attachment?.mime?.startsWith("image/") == true;

  const attachmentProperty = props.message.attachmentProperty;

  const imageEmbed = embed?.type == "image" && embed?.imageHeight != null;

  if (
    (attachment && !imageAttachment) ||
    (attachmentProperty && !attachmentProperty.image)
  )
    return (
      <FileEmbed
        attachment={attachment}
        attachmentProperty={attachmentProperty}
      />
    );

  if (imageAttachment || imageEmbed || attachmentProperty?.image) {
    return (
      <ImageEmbed
        attachment={attachment}
        embed={embed}
        attachmentProperty={attachmentProperty}
        container={props.container}
      />
    );
  }
  if (embed && embed?.type !== "image") {
    return <OGEmbed embed={embed} container={props.container} />;
  }
  return null;
};

const MessageReplies = (props: { message: Message }) => {
  const replies = props.message.replyMessages!;
  return (
    <div class={style.messageReplies}>
      <div class={style.arc}></div>
      <div class={style.replies}>
        {replies.map((reply) => (
          <ReplyMessage message={reply} />
        ))}
      </div>
    </div>
  );
};

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
    <div class={style.replyMessage}>
      {message ? (
        <>
          <Avatar user={creator} size={14} />
          <GradientText class={style.username} color={color}>
            {creator.username}
          </GradientText>
          <Markup
            class={style.content}
            text={message.content || "Attachment"}
            inline
          />
        </>
      ) : (
        <span
          class={`${style.replyMessage} ${style.deleted}`}
        >{t`Message was deleted.`}</span>
      )}
    </div>
  );
};
