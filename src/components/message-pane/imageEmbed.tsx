import type { AttachmentProperty } from "../../store/channelStore";
import type { LocalAttachment, LocalEmbed } from "../../store/messageStore";
import { buildImageUrl, constrainDimensions } from "../../utils/image";
import { throttle } from "../../utils/throttle";
import { Skeleton } from "../ui/skeleton";

import style from "./imageEmbed.module.css";

let DefaultHorizPadding = 74;

const originalSrc = (embed: LocalEmbed) => {
  const unsafeUrl = embed.imageUrl!;
  if (unsafeUrl.startsWith("https://") || unsafeUrl.startsWith("http://")) {
    return unsafeUrl;
  }
  return `http://${unsafeUrl}`;
};

export const ImageEmbed = (props: {
  attachment?: LocalAttachment;
  raw?: {
    width: number;
    height: number;
    src: string;
  };
  embed?: LocalEmbed;
  attachmentProperty?: AttachmentProperty;
  container: HTMLDivElement;
  maxWidth?: number;
  customHeight?: number;
  class?: string;
  horizPadding?: number;
}) => {
  const item = props.raw ? undefined : props.embed || props.attachment;
  const width =
    props.raw?.width ??
    (props.attachment
      ? props.attachment.width
      : props.attachmentProperty
        ? props.attachmentProperty.image?.width
        : props.embed?.imageWidth!);

  const height =
    props.raw?.height ??
    (props.attachment
      ? props.attachment.height
      : props.attachmentProperty
        ? props.attachmentProperty.image?.height
        : props.embed?.imageHeight!);

  let src = props.raw?.src ?? props.attachment?.path!;

  const origSrc =
    props.raw?.src ??
    (props.embed?.imageUrl ? originalSrc(props.embed) : undefined);

  if (!props.raw && props.embed?.imageUrl) {
    src = `proxy/${encodeURIComponent(originalSrc(props.embed))}/embed.webp`;
  }

  const cached = item?.cached;
  const [url, animated] = props.raw
    ? [props.raw.src, false]
    : buildImageUrl(src, {
        animate: document.hasFocus(),
        forceIsAnimated: props.embed?.animated,
      });
  const img = (
    <img
      src={
        props.raw?.src ??
        (props.attachmentProperty ? props.attachmentProperty.image?.src : url)
      }
      data-orig-src={origSrc}
      {...(animated && { "data-img-anim": "" })}
      loading="lazy"
      fetchpriority="high"
      decoding="async"
      class={[style.image, "image"]}
    />
  ) as HTMLImageElement;
  if (cached) img.classList.add(style.loaded!);
  const maxWidth = clamp(
    props.container.clientWidth - (props.horizPadding || DefaultHorizPadding),
    props.maxWidth || 600,
  );

  const maxHeight = props.customHeight
    ? props.customHeight / 2
    : Math.max(props.container.clientHeight / 2, 200);

  const skeleton = cached
    ? null
    : ((<Skeleton class={style.skeleton} />) as HTMLDivElement);
  img.onload = !cached
    ? () => {
        if (item) {
          item.cached = true;
        }
        skeleton?.remove();
        img.classList.add(style.loaded!);
        img.onload = null;
      }
    : null;

  const dims = constrainDimensions({
    width: width!,
    height: height!,
    maxWidth,
    maxHeight,
  });

  const showUploadProgress =
    props.attachmentProperty && dims.height > 30 && dims.width > 160;

  return (
    <div
      data-max-width={props.maxWidth}
      data-custom-height={props.customHeight}
      data-horiz-padding={props.horizPadding}
      class={[style.imageContainer, props.class, "imageEmbed"]}
      data-width={width}
      data-height={height}
      style={{ "--width": dims.width + "px", "--height": dims.height + "px" }}
    >
      {showUploadProgress && (
        <div class={[style.uploadProgressContainer, "uploadProgressContainer"]}>
          Uploading...
        </div>
      )}
      {skeleton}
      {img}
    </div>
  );
};

export const createImageEmbedResizer = (logElement: HTMLDivElement) => {
  const onResize = throttle(() => {
    const imageEmbeds = logElement.querySelectorAll(`.${style.imageContainer}`);
    const defaultMaxHeight = Math.max(logElement.clientHeight / 2, 200);

    for (let i = 0; i < imageEmbeds.length; i++) {
      const embedEl = imageEmbeds[i] as HTMLDivElement;
      const maxWidthOverride = parseInt(embedEl.dataset.maxWidth!);
      const customHeight = parseInt(embedEl.dataset.customHeight!);
      const horizPaddingOverride = parseInt(embedEl.dataset.horizPadding!);
      const maxHeight = customHeight ? customHeight / 2 : defaultMaxHeight;
      const maxWidth = clamp(
        logElement.clientWidth - (horizPaddingOverride || DefaultHorizPadding),
        maxWidthOverride || 600,
      );

      const imgWidth = parseInt(embedEl.dataset.width!);
      const imgHeight = parseInt(embedEl.dataset.height!);

      const dims = constrainDimensions({
        width: imgWidth,
        height: imgHeight,
        maxWidth,
        maxHeight,
      });

      embedEl.style.setProperty("--width", dims.width + "px");
      embedEl.style.setProperty("--height", dims.height + "px");
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
