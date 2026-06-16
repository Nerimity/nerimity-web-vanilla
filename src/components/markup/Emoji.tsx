import { h } from "../../h";
import { unicodeToTwemojiUrl } from "../../utils/emojis";
import { buildImageUrl } from "../../utils/image";

import style from "./Emoji.module.css";

interface CdnIconProps {
  icon: string;
  class?: string;
  title?: string;
}

const buildUrl = (props: CdnIconProps) => {
  if (props.icon.includes(".")) {
    return buildImageUrl(`emojis/${props.icon}`, {
      size: 28,
    });
  }
  return [unicodeToTwemojiUrl(props.icon!), false] as const;
};

export const Emoji = (props: CdnIconProps) => {
  const [url, animated] = buildUrl(props);

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
