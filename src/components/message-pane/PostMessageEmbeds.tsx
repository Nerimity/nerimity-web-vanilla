import type { Attachment, RawMessageEmbed } from "../../Types";
import type { AttachmentProperty } from "../../store/channelStore";
import { inviteLinkRegex } from "../../utils/regex";
import { FileEmbed } from "./FileEmbed";
import { ImageEmbed } from "./imageEmbed";
import { InviteEmbed } from "./InviteEmbed";
import { OGEmbed } from "./OGEmbed";

export const PostMessageEmbeds = (props: {
  attachments?: Attachment[];
  attachmentProperty?: AttachmentProperty;
  embed?: RawMessageEmbed;
  content?: string;
  container: HTMLDivElement;
  imageHorizPadding?: number;
  customHeight?: number;
}) => {
  const attachment = props.attachments?.[0];
  const embed = props.embed;

  const imageAttachment = !!attachment?.width;
  const isImageEmbed = embed?.type === "image" && embed?.imageHeight !== null;
  const isVideo = attachment?.mime?.startsWith("video/");
  const isAudio = attachment?.mime?.startsWith("audio/");
  const inviteCode = props.content?.match(inviteLinkRegex)?.[1];

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
      {inviteCode && <InviteEmbed code={inviteCode} />}
      {ogEmbed && (
        <OGEmbed
          embed={embed}
          container={props.container}
          customHeight={props.customHeight}
        />
      )}
    </>
  );
};
