import { h } from "../../h";
import type { AttachmentProperty } from "../../store/channelStore";
import type { LocalAttachment, LocalEmbed } from "../../store/messageStore";
import { buildImageUrl, constrainDimensions } from "../../utils/image";
import { throttle } from "../../utils/throttle";
import { Skeleton } from "../skeleton";

import style from "./imageEmbed.module.css";

export const ImageEmbed = (props: {
  attachment?: LocalAttachment;
  embed?: LocalEmbed;
  attachmentProperty?: AttachmentProperty;
  container: HTMLDivElement;
  maxWidth?: number;
  class?: string;
  horizPadding?: number;
}) => {
  const item = props.embed || props.attachment;
  const width = props.attachment
    ? props.attachment.width
    : props.attachmentProperty
      ? props.attachmentProperty.image?.width
      : props.embed?.imageWidth!;

  const height = props.attachment
    ? props.attachment.height
    : props.attachmentProperty
      ? props.attachmentProperty.image?.height
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

  const cached = item?.cached;
  const [url, animated] = buildImageUrl(src, {
    animate: document.hasFocus(),
    forceIsAnimated: props.embed?.animated,
  });
  const img = (
    <img
      src={props.attachmentProperty ? props.attachmentProperty.image?.src : url}
      {...(animated && { "data-img-anim": "" })}
      loading="lazy"
      class={[style.image, "image"]}
    />
  ) as HTMLImageElement;
  if (cached) img.classList.add(style.loaded!);
  const maxWidth = clamp(
    props.container.clientWidth - (props.horizPadding || 70),
    props.maxWidth || 600,
  );

  const maxHeight = Math.max(props.container.clientHeight / 2, 200);

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
    let maxWidth = clamp(logElement.clientWidth - 70, 600);
    const maxHeight = Math.max(logElement.clientHeight / 2, 200);

    for (let i = 0; i < imageEmbeds.length; i++) {
      const embedEl = imageEmbeds[i] as HTMLDivElement;
      const maxWidthOverride = parseInt(embedEl.dataset.maxWidth!);
      const horizPaddingOverride = parseInt(embedEl.dataset.horizPadding!);
      maxWidth = clamp(
        logElement.clientWidth - (horizPaddingOverride || 70),
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
