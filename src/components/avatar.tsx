import { BorderWithWings } from "../avatar-borders/BorderWithWings";
import { Dynamic } from "../dynamic";
import { hasBit } from "../utils/bitwise";
import { HoverHandler } from "../utils/HoverHandler";
import { buildImageUrl } from "../utils/image";
import {
  BadgeStyle,
  UserBadgeValues,
  type EarBadge,
  type UserBadge,
} from "../utils/UserBadgeFlag";
import type { CropPoints } from "./ImageCropModal";

import style from "./avatar.module.css";

const overlayReferenceSize = 42;

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

const BorderStyle = {
  [BadgeStyle.Wings]: BorderWithWings,
};

export const Avatar = (props: AvatarProps) => {
  const [url, animated] = buildUrl(props);
  const _hexColor = hexColor(props);
  const _firstLetter = firstLetter(props);

  const border = props.user?.badges
    ? UserBadgeValues.find(
        (b) => !b.overlay && hasBit(props.user?.badges, b.bit),
      )
    : undefined;

  const overlay = props.user?.badges
    ? UserBadgeValues.find(
        (b) => b.overlay && hasBit(props.user?.badges, b.bit),
      )
    : undefined;

  const BorderComponent = border
    ? BorderStyle[border.style! as keyof typeof BorderStyle]
    : undefined;

  return (
    <div
      class={["avatar", style.avatar, props.class]}
      style={{ "--size": props.size + "px" }}
      data-hover-selector={props.hoverSelector}
    >
      <Dynamic
        component={BorderComponent ?? "div"}
        border={BorderComponent && border}
        class={style.container}
      >
        {overlay && <Overlay overlay={overlay} border={border} />}
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

const EarOverlay = (props: { overlay: EarBadge; border?: UserBadge }) => {
  const offsetMap = props.overlay.assets.offset!;
  const styleType = (props.border?.style ??
    "default") as keyof typeof offsetMap;
  const offset =
    (offsetMap && styleType in offsetMap ? offsetMap[styleType] : undefined) ??
    offsetMap?.default ??
    0;

  const scale = props.overlay.assets.scale;

  const tail = props.overlay.assets.tail;
  const tailOffsetMap = tail?.offset;
  const tailOffset = tailOffsetMap?.[styleType];

  return (
    <div class={style.earsOverlay}>
      <img
        class={style.earImage}
        style={{
          "--ear-offset": offset / overlayReferenceSize,
          transform: scale ? `scale(${scale})` : undefined,
        }}
        src={`/avatar/ears/${props.overlay.assets.ear}.webp`}
        alt=""
      />
      {tail && (
        <img
          class={style.tailImage}
          style={{
            "--tail-bottom": tailOffset
              ? tailOffset.bottom / overlayReferenceSize
              : undefined,
            "--tail-left": tailOffset
              ? tailOffset.left / overlayReferenceSize
              : undefined,
          }}
          src={`/avatar/ears/${tail.asset}.webp`}
          alt=""
        />
      )}
    </div>
  );
};

const Overlay = (props: { overlay: UserBadge; border?: UserBadge }) => {
  return (
    <EarOverlay overlay={props.overlay as EarBadge} border={props.border} />
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
