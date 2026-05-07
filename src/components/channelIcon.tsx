import style from "./channelIcon.module.css";
import { h } from "../h";
import type { Channel } from "../store/channelStore";
import { unicodeToTwemojiUrl } from "../utils/emojis";
import { buildImageUrl } from "../utils/image";

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
      class={[style.channelIcon, props.class]}
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
