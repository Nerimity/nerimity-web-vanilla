import { css } from "@linaria/core";

import { h } from "../../h";
import { unicodeToTwemojiUrl } from "../../utils/emojis";
import { buildImageUrl } from "../../utils/image";

const emoji = css`
  width: 1.572em;
  height: 1.572em;
  cursor: pointer;
  vertical-align: -0.4em;
  object-fit: contain;
`;

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
      class={[emoji, "emoji"]}
      alt=""
      data-img-anim={animated}
    />
  );
};
