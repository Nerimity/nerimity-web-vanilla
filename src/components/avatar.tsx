import { BorderWithWings } from "../avatar-borders/BorderWithWings";
import { Dynamic } from "../dynamic";
import { hasBit } from "../utils/bitwise";
import { HoverHandler } from "../utils/HoverHandler";
import { buildImageUrl } from "../utils/image";
import { UserBadges } from "../utils/UserBadgeFlag";
import type { CropPoints } from "./ImageCropModal";

import style from "./avatar.module.css";

interface AvatarProps {
  hoverSelector?: string;
  user?: {
    avatar?: string;
    avatarUrl?: string;
    username: string;
    hexColor: string;
    badges?: number;
  } | null;

  image?: {
    url: string;
    cropPoints?: CropPoints;
  };

  server?: { avatar?: string; name: string; hexColor: string } | null;
  class?: string;

  size:
    | 12
    | 14
    | 16
    | 18
    | 24
    | 26
    | 28
    | 32
    | 40
    | 42
    | 48
    | 64
    | 72
    | 80
    | 96
    | 128;
  imgClass?: string;
}
const buildUrl = (props: AvatarProps) => {
  if (props.image?.url) {
    return [props.image.url, false];
  }
  let avatar = props.user?.avatar || props.server?.avatar;
  if (props.user?.avatarUrl) {
    try {
      const animated = props.user.avatarUrl.startsWith("a");
      const baseUrl = new URL(
        animated ? props.user.avatarUrl.slice(1) : props.user.avatarUrl,
      );

      avatar = `proxy/${encodeURIComponent(baseUrl.href)}/a.webp`;
    } catch {
      return [undefined, false] as const;
    }
  }
  if (!avatar) return [undefined, false] as const;
  return buildImageUrl(avatar, { size: props.size * 2 });
};

const hexColor = (props: AvatarProps) =>
  props.user?.hexColor || props.server?.hexColor!;

const firstLetter = (props: AvatarProps) => {
  const username = props.user?.username || props.server?.name;
  if (!username) return undefined;
  return username[0]!.toUpperCase();
};

export const Avatar = (props: AvatarProps) => {
  const [url, animated] = buildUrl(props);
  const _hexColor = hexColor(props);
  const _firstLetter = firstLetter(props);

  if (hasBit(props.user?.badges, UserBadges.FOUNDER.bit)) {
    console.log(props.user?.username);
  }

  return (
    <div
      class={["avatar", style.avatar, props.class]}
      style={{ "--size": props.size + "px" }}
      {...(props.hoverSelector && {
        "data-hover-selector": props.hoverSelector,
      })}
    >
      <Dynamic
        component={
          hasBit(props.user?.badges, UserBadges.FOUNDER.bit)
            ? BorderWithWings
            : "div"
        }
      >
        {url ? (
          props.image ? (
            <div class={style.avatarWrap}>
              <img
                src={url}
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
            <img
              loading="lazy"
              class={[style.avatarInner, style.image, props.imgClass]}
              src={url}
              alt=""
              {...(animated && { "data-img-anim": "" })}
            />
          )
        ) : (
          <div
            class={[style.avatarInner, style.avatarLetter]}
            style={{ "--color": _hexColor }}
          >
            {_firstLetter}
          </div>
        )}
      </Dynamic>
    </div>
  );
};

new HoverHandler(document.body, [
  {
    selector: `.${style.avatar}`,
    hoverSelectorAttribute: "data-hover-selector",

    onHover(el) {
      (el.firstChild as HTMLDivElement).dataset.hover = "true";
    },
    onBlur(el) {
      delete (el.firstChild as HTMLDivElement).dataset.hover;
    },
  },
]);
