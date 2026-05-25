import { css } from "@linaria/core";

import { h } from "../h";
import { buildImageUrl } from "../utils/image";

const avatar = css`
  width: var(--size);
  height: var(--size);
  .avatarInner {
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
  }

  .image {
    object-fit: cover;
  }
  .avatarLetter {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color);
    font-weight: bold;
    color: var(--gray-900);
  }
`;

interface AvatarProps {
  user?: { avatar?: string; username: string; hexColor: string } | null;
  server?: { avatar?: string; name: string; hexColor: string } | null;

  size: 12 | 16 | 24 | 28 | 32 | 40 | 42 | 48 | 64;
  imgClass?: string;
}
const buildUrl = (props: AvatarProps) => {
  const avatar = props.user?.avatar || props.server?.avatar;
  if (!avatar) return [undefined, false] as const;
  return buildImageUrl(avatar, { size: props.size + 8 });
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
    <div class={["avatar", avatar]} style={{ "--size": props.size + "px" }}>
      {url ? (
        <img
          loading="lazy"
          class={["avatarInner", "image", props.imgClass]}
          src={url}
          alt=""
          {...(animated && { "data-img-anim": "" })}
        />
      ) : (
        <div
          class={["avatarInner", "avatarLetter"]}
          style={{ "--color": _hexColor }}
        >
          {_firstLetter}
        </div>
      )}
    </div>
  );
};
