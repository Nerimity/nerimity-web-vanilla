import { t } from "@lingui/core/macro";

import { unicodeToTwemojiUrl } from "../../utils/emojis";
import { buildImageUrl } from "../../utils/image";
import { InviteEmbed } from "../message-pane/InviteEmbed";
import { createModal, Modal } from "../modal";

import style from "./Emoji.module.css";

interface CdnIconProps {
  icon: string;
  class?: string;
  title?: string;
  size?: number;
  animate?: boolean;
}

export const buildEmojiUrl = (props: CdnIconProps) => {
  if (props.icon.includes(".")) {
    return buildImageUrl(`emojis/${props.icon}`, {
      size: props.size || 48 * 2,
      animate: props.animate,
    });
  }
  return [unicodeToTwemojiUrl(props.icon!), false] as const;
};

export const Emoji = (props: CdnIconProps) => {
  const [url, animated] = buildEmojiUrl(props);

  return (
    <img
      loading="lazy"
      title={props.title}
      data-icon={props.icon}
      src={url}
      class={[style.emoji, "emoji"]}
      alt=""
      data-img-anim={animated}
    />
  );
};

export const handleMarkupEmojiClick = (opts: {
  el: HTMLElement;
  signal: AbortSignal;
}) => {
  opts.el.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLDivElement;
      const emojiEl = target.closest(`.${style.emoji}`) as HTMLDivElement;
      if (!emojiEl) return;

      const icon = emojiEl.dataset.icon!;

      const isId = icon?.includes(".");

      const id = isId ? icon.split(".")[0]! : null;
      const unicode = !isId ? icon : null;
      const title = emojiEl.title;

      createEmojiDetailsModal({ id, unicode, icon, title });
    },
    { signal: opts.signal },
  );
};

const createEmojiDetailsModal = (opts: {
  icon: string;
  id: string | null;
  unicode: string | null;
  title: string;
}) => {
  const ac = new AbortController();

  const [url, animated] = buildEmojiUrl({
    icon: opts.icon,
    animate: true,
    size: 80,
  });

  const el = (
    <Modal.Root>
      <Modal.Header
        icon="face"
        label={opts.id ? t`Custom Emoji` : t`Default Emoji`}
      />
      <Modal.Body>
        <div class={style.detailsModal}>
          <img
            loading="lazy"
            title={opts.title}
            src={url}
            class={[style.modalEmoji, "emoji"]}
            alt=""
            data-img-anim={animated}
          />
          <div>{opts.title}</div>

          {opts.id && <InviteEmbed emojiId={opts.id} />}
        </div>
      </Modal.Body>
    </Modal.Root>
  );

  createModal(() => el, ac);
};
