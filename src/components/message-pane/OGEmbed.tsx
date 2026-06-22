import { cdnUrl } from "../../config";
import { h } from "../../h";
import type { RawMessageEmbed } from "../../Types";

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
  const proxyImgSrc = !origImgSrc
    ? null
    : `${cdnUrl}proxy/${encodeURIComponent(origImgSrc)}/embed.webp`;
  const largeImage = embed.largeImage;

  return (
    <div class={style.ogEmbed}>
      <div class={style.details}>
        {!largeImage && origImgSrc && (
          <img class={style.smallImage} src={proxyImgSrc} loading="lazy" />
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
        <img class={style.largeImage} src={proxyImgSrc} loading="lazy" />
      )}
    </div>
  );
};