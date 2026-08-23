import { buildImageUrl } from "../utils/image";
import { createResizeObserver } from "../utils/observer";
import type { CropPoints } from "./ImageCropModal";

import style from "./Banner.module.css";

export const Banner = (props: {
  user?: { banner?: string; hexColor?: string };
  server?: { banner?: string; hexColor?: string };
  children?: any;
  initialAnimate?: boolean;
  size?: number;

  image?: {
    url: string;
    cropPoints?: CropPoints;
  };
}) => {
  const banner = props.server?.banner || props.user?.banner;
  const hexColor = props.server?.hexColor || props.user?.hexColor;

  const [url, animated] = buildImageUrl(banner, {
    animate: props.initialAnimate,
    size: props.size,
  });

  return (
    <div class={style.banner}>
      {props.image ? (
        <div class={style.bannerWrap}>
          <img
            src={props.image.url}
            class={style.croppedImage}
            style={
              props.image.cropPoints
                ? {
                    "--startX": props.image.cropPoints[0],
                    "--startY": props.image.cropPoints[1],
                    "--endX": props.image.cropPoints[2],
                    "--endY": props.image.cropPoints[3],
                  }
                : {}
            }
          />
        </div>
      ) : (
        <>
          {!url && (
            <div style={{ "--color": hexColor }} class={style.bannerImage} />
          )}
          {url && (
            <img
              {...(animated && { "data-img-anim": "" })}
              class={style.bannerImage}
              src={url}
            />
          )}
        </>
      )}

      <div class={style.overlay}>{props.children}</div>
    </div>
  );
};

export function bannerCroppedHandler(
  container: HTMLDivElement,
  signal: AbortSignal,
) {
  createResizeObserver(
    container,
    (event) => {
      container.style.setProperty("--w", event.width + "px");
      container.style.setProperty("--h", event.height + "px");
    },
    { signal },
  );
}
