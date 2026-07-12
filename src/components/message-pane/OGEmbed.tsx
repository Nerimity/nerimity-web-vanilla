import { h } from "../../h";
import type { RawMessageEmbed } from "../../Types";
import { MarkupLink } from "../markup/MarkupLink";
import { ImageEmbed } from "./imageEmbed";

import style from "./OGEmbed.module.css";
interface OGEmbedProps {
  embed: RawMessageEmbed;
  container: HTMLDivElement;
}

const getOrigSrc = (embed: RawMessageEmbed) => {
  const rawUrl = embed.imageUrl;
  if (!rawUrl) return null;
  if (rawUrl.startsWith("https://") || rawUrl.startsWith("http://"))
    return rawUrl;
  return `https://${embed.domain}/${rawUrl}`;
};

export const OGEmbed = (props: OGEmbedProps) => {
  const embed = props.embed;
  const origImgSrc = getOrigSrc(embed);

  const largeImage = embed.largeImage;

  if (!largeImage) {
    embed.imageWidth = 100;
    embed.imageHeight = 100;
  }

  return (
    <div
      class={style.ogEmbed}
      data-has-large-image={largeImage}
      style={{ "--theme-color": embed.themeColor }}
    >
      <div class={style.details}>
        {!largeImage && origImgSrc && (
          <ImageEmbed
            class={style.smallImage}
            maxWidth={100}
            embed={props.embed}
            container={props.container}
          />
        )}
        <div class={style.detailsInner}>
          <MarkupLink class={style.title} name={embed.title!} url={embed.url} />
          <div class={style.description}>{embed.description}</div>
        </div>
      </div>
      {largeImage && origImgSrc && (
        <ImageEmbed
          class={style.largeImage}
          maxWidth={478}
          horizPadding={90}
          embed={props.embed}
          container={props.container}
        />
      )}
    </div>
  );
};
