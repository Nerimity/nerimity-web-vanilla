import { t } from "@lingui/core/macro";

import type { RawPost } from "../../Types";
import { friendlyTimestamp, fullDate } from "../../utils/date";
import { getFont } from "../../utils/font";
import { inviteLinkRegex } from "../../utils/regex";
import { Avatar } from "../avatar";
import { Icon } from "../icon";
import { Link } from "../link";
import { Markup } from "../markup/markup";
import { FileEmbed } from "../message-pane/FileEmbed";
import { ImageEmbed } from "../message-pane/imageEmbed";
import { InviteEmbed } from "../message-pane/InviteEmbed";
import { OGEmbed } from "../message-pane/OGEmbed";
import { isNewDay, isNewUser } from "../message-pane/utils";
import { ServerClanItem } from "../serverClanItem";

import style from "./PostItem.module.css";

export const PostItem = (props: {
  post: RawPost;
  prevPost?: RawPost;
  hideNewDayMarker?: boolean;
  container: HTMLDivElement;
}) => {
  const creator = props.post.createdBy;

  const newDay =
    !props.hideNewDayMarker && isNewDay(props.post, props.prevPost);

  const isImageEmbedOnly =
    props.post.embed?.type == "image" && !props.post.content?.includes(" ");

  const font = getFont(creator.profile?.font);

  return (
    <div data-id={props.post.id}>
      {newDay && <Marker label={fullDate(props.post.createdAt)} />}

      <div class={["postItem", style.postItem, style.withDetails]}>
        <div class={[style.postContainer, "postContainer"]}>
          <Link
            href={`/app/profile/${creator.id}`}
            data-user-id={creator.id}
            class={style.avatar}
          >
            <Avatar
              user={creator}
              size={40}
              hoverSelector={`.${style.postItem}`}
            />
          </Link>
          <div class={style.postBody}>
            <span class={[style.details, "details"]}>
              <Link
                data-user-id={creator.id}
                decoration
                href={`/app/profile/${creator.id}`}
                class={[style.username, font?.class, "font"]}
              >
                {creator.username}
              </Link>
              {isNewUser(creator) && (
                <Icon
                  class={style.newUserIcon}
                  name="deceased"
                  title={t`New to Nerimity`}
                />
              )}
              {creator?.profile?.clan && (
                <ServerClanItem clan={creator.profile.clan} />
              )}

              {creator.bot && <div class={style.badge}>{t`Bot`}</div>}
              <span class={style.timestamp}>
                {friendlyTimestamp(props.post.createdAt)}
              </span>
            </span>
            <div class={style.content}>
              {!isImageEmbedOnly && (
                <Markup
                  replaceCommandBotId
                  animateInitialOnFocus
                  text={props.post.content || ""}
                  container={props.container}
                  class={["focusAnimate", style.postContent]}
                />
              )}
              <PostEmbeds post={props.post} container={props.container} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Marker = (props: { label?: string }) => {
  return (
    <div class={style.marker}>
      <span>{props.label}</span>
      <div class={style.line} />
    </div>
  );
};

const PostEmbeds = (props: { post: RawPost; container: HTMLDivElement }) => {
  const attachment = props.post.attachments?.[0];

  const embed = props.post.embed;

  const imageAttachment = !!attachment?.width;
  // const attachmentProperty = props.message.attachmentProperty;
  const imageEmbed = embed?.type === "image" && embed?.imageHeight !== null;

  const isVideo = attachment?.mime?.startsWith("video/");
  const isAudio = attachment?.mime?.startsWith("audio/");

  const inviteCode = props.post.content?.match(inviteLinkRegex)?.[1];

  if (inviteCode) {
    return <InviteEmbed code={inviteCode} />;
  }

  if (
    (attachment && !imageAttachment) ||
    // (attachmentProperty && !attachmentProperty.image) ||
    isVideo ||
    isAudio
  )
    return (
      <FileEmbed
        attachment={attachment}
        // attachmentProperty={attachmentProperty}
      />
    );

  if (embed && embed?.type !== "image") {
    return (
      <OGEmbed embed={embed} container={props.container} customHeight={1120} />
    );
  }
  if (
    imageAttachment ||
    imageEmbed
    //  || attachmentProperty?.image
  ) {
    return (
      <ImageEmbed
        attachment={attachment}
        embed={embed}
        horizPadding={66}

        // attachmentProperty={attachmentProperty}

        container={props.container}
        customHeight={1120}
      />
    );
  }
  return null;
};
