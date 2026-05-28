import { css } from "@linaria/core";

import { h } from "../../h";
import type { LocalAttachment, LocalEmbed } from "../../store/messageStore";
import { buildImageUrl, constrainDimensions } from "../../utils/image";
import { throttle } from "../../utils/throttle";
import { Skeleton } from "../skeleton";

const imageContainer = css`
  width: var(--width);
  height: var(--height);
  border-radius: var(--radius-8);
  overflow: hidden;
  position: relative;
  .image {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    &.loaded {
      opacity: 1;
    }
  }
  .skeleton {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
  }
`;
export const ImageEmbed = (props: {
  attachment?: LocalAttachment;
  embed?: LocalEmbed;
  container: HTMLDivElement;
}) => {
  const item = props.embed || props.attachment!;
  const width = props.attachment
    ? props.attachment.width
    : props.embed?.imageWidth!;
  const height = props.attachment
    ? props.attachment.height
    : props.embed?.imageHeight!;

  let src = props.attachment?.path!;
  if (props.embed?.imageUrl) {
    const unsafeUrl = props.embed.imageUrl!;
    if (unsafeUrl.startsWith("https://") || unsafeUrl.startsWith("http://")) {
      src = unsafeUrl;
    } else {
      src = `http://${unsafeUrl}`;
    }
    src = `proxy/${encodeURIComponent(src)}/embed.webp`;
  }

  const cached = item.cached;
  const [url, animated] = buildImageUrl(src, {
    animate: document.hasFocus(),
    forceIsAnimated: props.embed?.animated,
  });
  const img = (
    <img
      src={url}
      {...(animated && { "data-img-anim": "" })}
      loading="lazy"
      class={"image"}
    />
  ) as HTMLImageElement;
  if (cached) img.classList.add("loaded");
  const maxWidth = clamp(props.container.clientWidth - 70, 600);

  const maxHeight = Math.max(props.container.clientHeight / 2, 200);

  const skeleton = cached
    ? null
    : ((<Skeleton class="skeleton" />) as HTMLDivElement);
  img.onload = !cached
    ? () => {
        item.cached = true;
        skeleton?.remove();
        img.classList.add("loaded");
        img.onload = null;
      }
    : null;

  const dims = constrainDimensions({
    width: width!,
    height: height!,
    maxWidth,
    maxHeight,
  });

  return (
    <div
      class={[imageContainer, "imageEmbed"]}
      data-width={width}
      data-height={height}
      style={{ "--width": dims.width, "--height": dims.height }}
    >
      {skeleton}
      {img}
    </div>
  );
};

export const createImageEmbedResizer = (logElement: HTMLDivElement) => {
  const onResize = throttle(() => {
    const imageEmbeds = logElement.querySelectorAll(`.${imageContainer}`);
    const maxWidth = clamp(logElement.clientWidth - 70, 600);
    const maxHeight = Math.max(logElement.clientHeight / 2, 200);

    for (let i = 0; i < imageEmbeds.length; i++) {
      const embedEl = imageEmbeds[i] as HTMLDivElement;

      const imgWidth = parseInt(embedEl.dataset.width!);
      const imgHeight = parseInt(embedEl.dataset.height!);

      const dims = constrainDimensions({
        width: imgWidth,
        height: imgHeight,
        maxWidth,
        maxHeight,
      });

      embedEl.style.setProperty("--width", dims.width);
      embedEl.style.setProperty("--height", dims.height);
    }
  }, 20);

  const observer = new ResizeObserver(onResize);
  observer.observe(logElement);

  const destroy = () => {
    observer.disconnect();
  };

  return {
    destroy,
  };
};

function clamp(num: number, max: number) {
  return num >= max ? max : num;
}
