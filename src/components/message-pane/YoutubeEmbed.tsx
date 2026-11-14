import type { RawMessageEmbed } from "../../Types";
import { closestFromEvent } from "../../utils/dom";
import { MarkupLink } from "../markup/MarkupLink";
import { Button } from "../ui/button";

import style from "./YoutubeEmbed.module.css";
interface OGEmbedProps {
  embed: RawMessageEmbed;
  regex: RegExpMatchArray;
  container: HTMLDivElement;
  customHeight?: number;
}

const THUMBNAIL_FALLBACKS = ["sddefault", "hqdefault", "mqdefault"];

const ToSecRegex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;

const toSeconds = (t: string) => {
  if (/^\d+$/.test(t)) return Number(t);

  const [, h = 0, min = 0, s = 0] = t.match(ToSecRegex) ?? [];
  return +h * 3600 + +min * 60 + +s;
};

function applyThumbnailFallback(el: HTMLImageElement, code: string, index = 0) {
  el.onload = () => {
    if (el.naturalWidth === 120 && el.naturalHeight === 90) {
      applyThumbnailFallback(el, code, index + 1);
    }
  };
  el.src = `https://i.ytimg.com/vi/${code}/${THUMBNAIL_FALLBACKS[index]}.jpg`;
}

const elToYoutubeRegex = new WeakMap<HTMLDivElement, RegExpMatchArray>();

export const YoutubeEmbed = (props: OGEmbedProps) => {
  const embed = props.embed;

  const ytCode = props.regex[3]!;

  const imgEl = new Image();
  applyThumbnailFallback(imgEl, ytCode);

  const el = (
    <div
      class={[style.ogEmbed, "ytEmbed"]}
      data-has-large-image
      style={{ "--theme-color": embed.themeColor }}
    >
      <div class={style.video}>
        {imgEl}
        <Button class={style.playButton} icon="play_arrow" />
      </div>
      <div class={style.details}>
        <div class={style.detailsInner}>
          <MarkupLink
            class={style.title}
            name={embed.title!}
            url={embed.origUrl!}
          />
          <div class={style.subtitle}>
            {embed.channelName} ~ {embed.viewCount} ~ {embed.uploadDate}
          </div>
          <div class={style.description}>{embed.description}</div>
        </div>
      </div>
    </div>
  ) as HTMLDivElement;

  elToYoutubeRegex.set(el, props.regex);

  return el;
};

const createYoutubeIframe = (regex: RegExpMatchArray) => {
  const ytCode = regex[3]!;
  const rawSec = regex[5];

  return (
    <iframe
      width="100%"
      height="100%"
      src={`https://www.youtube-nocookie.com/embed/${ytCode}?autoplay=1&start=${rawSec ? toSeconds(rawSec) : 0}`}
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    />
  );
};

export const handleYoutubeEmbed = (
  container: HTMLDivElement,
  signal: AbortSignal,
) => {
  container.addEventListener(
    "click",
    (e) => {
      const el = closestFromEvent(e, ".ytEmbed");
      if (!el) return;
      const regex = elToYoutubeRegex.get(el);
      if (!regex) return;

      const video = closestFromEvent(e, `.${style.video}`);
      if (!video) return;
      if (video) {
        e.preventDefault();
        video.replaceChildren(createYoutubeIframe(regex));
      }
    },
    { signal },
  );
};
