import { h } from "../../h";
import type { RawMessageEmbed } from "../../Types";
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

  return (
    <div class={style.ogEmbed} data-has-large-image={largeImage}>
      <div class={style.details}>
        {!largeImage && origImgSrc && (
          <ImageEmbed
            class={style.smallImage}
            maxWidth={100}
            embed={{ ...props.embed, imageWidth: 100, imageHeight: 100 }}
            container={props.container}
          />
        )}
        <div class={style.detailsInner}>
          <a
            decoration
            class={style.title}
            href={embed.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            {embed.title}
          </a>

          <div class={style.description}>{embed.description}</div>
        </div>
      </div>
      {largeImage && origImgSrc && (
        <ImageEmbed
          class={style.largeImage}
          maxWidth={488}
          embed={props.embed}
          container={props.container}
        />
      )}
    </div>
  );
};
