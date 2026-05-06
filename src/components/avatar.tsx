import style from "./avatar.module.css";
import { h } from "../h";
import { buildImageUrl } from "../utils/image";

interface AvatarProps {
  user?: { avatar?: string; username: string; hexColor: string };
  server?: { avatar?: string; name: string; hexColor: string };

  size: 16 | 24 | 32 | 40 | 42 | 48 | 64;
}
const url = (props: AvatarProps) => {
  const avatar = props.user?.avatar || props.server?.avatar;
  if (!avatar) return undefined;
  return buildImageUrl(avatar, { size: props.size + 8 });
};

const hexColor = (props: AvatarProps) =>
  props.user?.hexColor || props.server?.hexColor!;

const firstLetter = (props: AvatarProps) => {
  const username = props.user?.username || props.server?.name;
  if (!username) return undefined;
  return username[0]!.toUpperCase();
};

export const createAvatar = (props: AvatarProps) => {
  const _url = url(props);
  const _hexColor = hexColor(props);
  const _firstLetter = firstLetter(props);
  return (
    <div class={style.avatar} style={{ "--size": props.size + "px" }}>
      {_url ? (
        <img
          loading="lazy"
          class={[style.avatarInner, style.image]}
          src={url(props)}
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
