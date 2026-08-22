import { buildImageUrl } from "../utils/image";

import style from "./Banner.module.css";

export const Banner = (props: {
  user?: { banner?: string; hexColor?: string };
  server?: { banner?: string; hexColor?: string };
  children?: any;
  initialAnimate?: boolean;
  size?: number;
}) => {
  const banner = props.server?.banner || props.user?.banner;
  const hexColor = props.server?.hexColor || props.user?.hexColor;

  const [url, animated] = buildImageUrl(banner, {
    animate: props.initialAnimate,
    size: props.size,
  });

  return (
    <div class={style.banner}>
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
      <div class={style.overlay}>{props.children}</div>
    </div>
  );
};
