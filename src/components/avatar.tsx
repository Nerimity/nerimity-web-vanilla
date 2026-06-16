import { h } from "../h";
import { buildImageUrl } from "../utils/image";

import style from "./avatar.module.css";

interface AvatarProps {
  user?: { avatar?: string; username: string; hexColor: string } | null;
  server?: { avatar?: string; name: string; hexColor: string } | null;

  size: 12 | 14 | 16 | 24 | 28 | 32 | 40 | 42 | 48 | 64 | 72 | 80 | 96 | 128;
  imgClass?: string;
}
const buildUrl = (props: AvatarProps) => {
  const avatar = props.user?.avatar || props.server?.avatar;
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
  return (
    <div
      class={["avatar", style.avatar]}
      style={{ "--size": props.size + "px" }}
    >
      {url ? (
        <img
          loading="lazy"
          class={[style.avatarInner, style.image, props.imgClass]}
          src={url}
          alt=""
          {...(animated && { "data-img-anim": "" })}
        />
      ) : (
        <div
          class={[style.avatarInner, style.avatarLetter]}
          style={{ "--color": _hexColor }}
        >
          {_firstLetter}
        </div>
      )}
    </div>
  );
};
