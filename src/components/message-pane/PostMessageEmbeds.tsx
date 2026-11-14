import type { AttachmentProperty } from "../../store/channelStore";
import type { Attachment, RawMessageEmbed, RawPostPoll } from "../../Types";
import { inviteLinkRegex, YoutubeLinkRegex } from "../../utils/regex";
import { PostPollEmbed } from "../posts/PostPollEmbed";
import { FileEmbed } from "./FileEmbed";
import { ImageEmbed } from "./imageEmbed";
import { InviteEmbed } from "./InviteEmbed";
import { OGEmbed } from "./OGEmbed";
import { YoutubeEmbed } from "./YoutubeEmbed";

export const PostMessageEmbeds = (props: {
  attachments?: Attachment[];
  attachmentProperty?: AttachmentProperty;
  embed?: RawMessageEmbed;
  content?: string;
  container: HTMLDivElement;
  imageHorizPadding?: number;
  customHeight?: number;
  poll?: RawPostPoll;
  pollCreatorId?: string;
}) => {
  const attachment = props.attachments?.[0];
  const embed = props.embed;

  const imageAttachment = !!attachment?.width;
  const isImageEmbed = embed?.type === "image" && embed?.imageHeight !== null;
  const isVideo = attachment?.mime?.startsWith("video/");
  const isAudio = attachment?.mime?.startsWith("audio/");
  const inviteCode = props.content?.match(inviteLinkRegex)?.[1];

  const youtubeMatch = props.content?.match(YoutubeLinkRegex);

  const fileEmbed =
    (attachment && !imageAttachment) ||
    (props.attachmentProperty && !props.attachmentProperty.image) ||
    isVideo ||
    isAudio;

  const hasImageEmbed =
    imageAttachment || isImageEmbed || props.attachmentProperty?.image;
  const ogEmbed = embed && embed.type !== "image";

  return (
    <>
      {fileEmbed ? (
        <FileEmbed
          attachment={attachment}
          attachmentProperty={props.attachmentProperty}
        />
      ) : hasImageEmbed ? (
        <ImageEmbed
          attachment={attachment}
          embed={attachment || props.attachmentProperty ? undefined : embed}
          horizPadding={props.imageHorizPadding}
          attachmentProperty={props.attachmentProperty}
          container={props.container}
          customHeight={props.customHeight}
        />
      ) : null}

      {props.poll && (
        <PostPollEmbed poll={props.poll} pollCreatorId={props.pollCreatorId} />
      )}

      {(() => {
        if (inviteCode) return <InviteEmbed code={inviteCode} />;

        if (embed && youtubeMatch)
          return (
            <YoutubeEmbed
              container={props.container}
              customHeight={props.customHeight}
              embed={embed}
              regex={youtubeMatch}
            />
          );

        if (ogEmbed) {
          return (
            <OGEmbed
              embed={embed}
              container={props.container}
              customHeight={props.customHeight}
            />
          );
        }
      })()}
    </>
  );
};
