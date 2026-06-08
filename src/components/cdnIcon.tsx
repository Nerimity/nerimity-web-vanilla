import { css } from "@linaria/core";

import { h } from "../h";
import { ChannelType } from "../Types";
import { unicodeToShortcode, unicodeToTwemojiUrl } from "../utils/emojis";
import { buildImageUrl } from "../utils/image";
import { Icon } from "./icon";

const cdnIcon = css`
  display: flex;
  width: var(--size);
  height: var(--size);
  box-sizing: content-box;
  padding: 4px;
  border-radius: var(--radius-4);
  background-color: var(--gray-800);
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .icon {
    font-size: var(--size);
  }
`;

interface CdnIconProps {
  channel?: { icon?: string; type: ChannelType };
  role?: { icon?: string };
  clan?: { icon?: string };
  reaction?: { name: string; emojiId: string; webp: boolean; gif: boolean };
  class?: string;
  size: number;
}

const buildUrl = (props: CdnIconProps) => {
  let title: string | undefined = undefined;
  let icon =
    props.channel?.icon ||
    props.role?.icon ||
    props.clan?.icon ||
    props.reaction?.name;

  if (props.reaction?.emojiId) {
    title = props.reaction.name;
    const { emojiId, gif, webp } = props.reaction;
    icon = emojiId;
    if (webp || (!gif && !webp)) {
      icon += `.webp${gif ? "#a" : ""}`;
    } else if (gif) {
      icon += ".gif";
    }
  }

  if (!icon) return [null, false, null] as const;

  if (icon!.includes(".")) {
    const res = buildImageUrl(`emojis/${icon}`, {
      size: props.size + 8,
    }) as unknown as [string, boolean, string | undefined];
    res.push(title);
    return res;
  }

  title = unicodeToShortcode[icon!];
  return [unicodeToTwemojiUrl(icon!), false, title] as const;
};

export const CdnIcon = (props: CdnIconProps) => {
  const [url, animated, title] = buildUrl(props);

  return (
    <div
      class={[cdnIcon, props.class]}
      style={{ "--size": props.size + "px" }}
      title={title}
    >
      {url ? (
        <img
          loading="lazy"
          src={url}
          alt=""
          {...(animated && { "data-img-anim": "" })}
        />
      ) : props.channel ? (
        <Icon
          class="icon"
          name={
            props.channel?.type === ChannelType.CATEGORY ? "segment" : "tag"
          }
        />
      ) : null}
    </div>
  );
};
