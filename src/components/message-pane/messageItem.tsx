import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import { friendStore } from "../../store/friendStore";
import { type Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { userStore } from "../../store/userStore";
import { MessageType, type RawReplyMessage } from "../../Types";
import { resolveGradient } from "../../utils/color";
import { formatTimestamp, friendlyTimestamp, fullDate } from "../../utils/date";
import { Avatar } from "../avatar";
import { CdnIcon } from "../cdnIcon";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Link } from "../link";
import { Markup } from "../markup/markup";
import { ServerClanItem } from "../serverClanItem";
import { FileEmbed } from "./FileEmbed";
import { HtmlEmbed } from "./HtmlEmbed";
import { ImageEmbed } from "./imageEmbed";
import { MessageReactions } from "./MessageReactions";
import { OGEmbed } from "./OGEmbed";
import { SystemMessage } from "./SystemMessage";
import { isMentioned, isNewDay, isNewUser, shouldGroup } from "./utils";

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

  const server = serverStore.servers.get(serverStore.currentServerId!);

  const member = serverMemberStore.serverMembers
    .get(serverStore.currentServerId!)
    ?.get(creator.id);

  const topRole = serverStore.memberTopColorAndIcon(member);
  const color = resolveGradient(topRole?.color) ?? "";

  const name = member?.nickname || creator.username;

  const isImageEmbedOnly =
    props.message.embed?.type == "image" &&
    !props.message.content?.includes(" ");

  const hasMessageReplies = !!props.message.replyMessages?.length;
  const editing = channelProperty?.editingMessage?.id === props.message.id;
  const replying = channelProperty?.replyingMessages?.includes(props.message);

  const isContentMessage = props.message.type === MessageType.CONTENT;

  const someoneMentioned = props.message.content?.includes("[@:s]");

  const isFriendBlocked =
    !props.message.showBlocked && friendStore.isFriendBlocked(creator.id);

  const mentioned = isMentioned({
    message: props.message,
    member,
    server,
  });

  const htmlEmbed = props.message.htmlEmbed;

  const muted = member?.muteExpireAt ? member.muteExpireAt > Date.now() : null;
  const mutedUntil = member?.muteExpireAt
    ? formatTimestamp(member.muteExpireAt)
    : null;

  const isServerCreator = props.message.createdBy.id === server?.createdById;

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
            (editing || replying) && "editing",
            someoneMentioned && style.someoneMentioned,
            !someoneMentioned && mentioned && style.mentioned,
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
                  <Link
                    href={`/app/profile/${creator.id}`}
                    data-user-id={creator.id}
                    class={style.avatar}
                  >
                    <Avatar user={creator} size={40} />
                  </Link>
                )}
                <div class={style.messageBody}>
                  {!group && (
                    <span class={[style.details, "details"]}>
                      {muted && (
                        <Icon
                          title={
                            mutedUntil ? t`Muted until ${mutedUntil}` : null
                          }
                          name="volume_off"
                          class={style.muted}
                        />
                      )}
                      <GradientText
                        data-user-id={creator.id}
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
                      {props.message.pinned && (
                        <Icon
                          title={t`Pinned Message`}
                          name="keep"
                          class={style.pinned}
                        />
                      )}

                      {(props.message.createdBy.bot || isServerCreator) && (
                        <div class={style.badge}>
                          {props.message.webhookId
                            ? t`Webhook`
                            : props.message.createdBy.bot
                              ? t`Bot`
                              : t`Owner`}
                        </div>
                      )}
                      <span class={style.timestamp}>
                        {friendlyTimestamp(props.message.createdAt)}
                      </span>
                      {props.message.silent && (
                        <Icon
                          title={t`Silent`}
                          name="notifications_off"
                          class={style.silent}
                        />
                      )}
                    </span>
                  )}
                  <div class={style.content}>
                    {!isImageEmbedOnly && (
                      <Markup
                        replaceCommandBotId
                        animateInitialOnFocus
                        text={props.message.content || ""}
                        message={props.message}
                        class={["focusAnimate", style.messageContent]}
                      />
                    )}
                    {htmlEmbed && <HtmlEmbed htmlEmbed={htmlEmbed} />}
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

  const color = resolveGradient(topRoleColor) ?? "";

  return (
    <div class={style.replyMessage}>
      {message ? (
        <>
          <Avatar user={creator} size={14} />
          <GradientText
            class={style.username}
            data-user-id={creator.id}
            tag={Link}
            decoration
            color={color}
            href={`/app/profile/${creator.id}`}
          >
            {creator.username}
          </GradientText>
          <Markup
            replaceCommandBotId
            animateInitialOnFocus
            class={[style.content, "focusAnimate"]}
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
