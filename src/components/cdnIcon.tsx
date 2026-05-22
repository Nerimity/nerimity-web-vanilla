import { css } from "@linaria/core";

import { h } from "../h";
import { ChannelType } from "../Types";
import { unicodeToTwemojiUrl } from "../utils/emojis";
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
    object-fit: cover;
  }
  .icon {
    font-size: var(--size);
  }
`;

interface CdnIconProps {
  channel?: { icon?: string; type: ChannelType };
  role?: { icon?: string };
  clan?: { icon?: string };
  class?: string;
  size: number;
}

const buildUrl = (props: CdnIconProps) => {
  const icon = props.channel?.icon || props.role?.icon || props.clan?.icon;
  if (!icon) return [null, false] as const;

  if (icon!.includes(".")) {
    return buildImageUrl(`emojis/${icon}`, {
      size: props.size + 8,
    });
  }
  return [unicodeToTwemojiUrl(icon!), false] as const;
};

export const CdnIcon = (props: CdnIconProps) => {
  const [url, animated] = buildUrl(props);

  return (
    <div class={[cdnIcon, props.class]} style={{ "--size": props.size + "px" }}>
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
