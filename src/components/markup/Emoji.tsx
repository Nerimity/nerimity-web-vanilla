import { h } from "../../h";
import { unicodeToTwemojiUrl } from "../../utils/emojis";
import { buildImageUrl } from "../../utils/image";

import style from "./Emoji.module.css";

interface CdnIconProps {
  icon: string;
  class?: string;
  title?: string;
  size?: number;
  animate?: boolean;
}

export const buildEmojiUrl = (props: CdnIconProps) => {
  if (props.icon.includes(".")) {
    return buildImageUrl(`emojis/${props.icon}`, {
      size: props.size || 48 * 2,
      animate: props.animate,
    });
  }
  return [unicodeToTwemojiUrl(props.icon!), false] as const;
};

export const Emoji = (props: CdnIconProps) => {
  const [url, animated] = buildEmojiUrl(props);

  return (
    <img
      loading="lazy"
      title={props.title}
      src={url}
      class={[style.emoji, "emoji"]}
      alt=""
      data-img-anim={animated}
    />
  );
};
