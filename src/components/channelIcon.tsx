import { h } from "../h";
import type { Channel } from "../store/channelStore";
import { unicodeToTwemojiUrl } from "../utils/emojis";
import { buildImageUrl } from "../utils/image";
import { css } from "@linaria/core";

const channelIcon = css`
  display: flex;
  width: var(--size);
  height: var(--size);
  box-sizing: content-box;
  padding: 4px;
  border-radius: var(--radius-4);
  background-color: var(--slate-800);
  img {
    width: 100%;
    height: 100%;
  }
`;

interface ChannelIconProps {
  channel: Channel;
  class?: string;
  size: number;
}

const buildUrl = (props: ChannelIconProps) => {
  const icon = props.channel.icon;
  if (!icon) return [null, false] as const;

  if (icon!.includes(".")) {
    return buildImageUrl(`emojis/${icon}`, {
      size: props.size + 8,
    });
  }
  return [unicodeToTwemojiUrl(icon!), false] as const;
};

export const ChannelIcon = (props: ChannelIconProps) => {
  const [url, animated] = buildUrl(props);

  return (
    <div
      class={[channelIcon, props.class]}
      style={{ "--size": props.size + "px" }}
    >
      {url ? (
        <img
          data-img-anim
          loading="lazy"
          src={url}
          alt=""
          {...(animated && { "data-img-anim": "" })}
        />
      ) : (
        // <Icon name="segment" color="rgba(255,255,255,0.6)" size={18} />
        <div>icon</div>
      )}
    </div>
  );
};
