import { t } from "@lingui/core/macro";

import type { Message } from "../../store/messageStore";
import type { RawMessage } from "../../Types";
import { Avatar } from "../avatar";
import { Link } from "../link";
import { ImageEmbed } from "../message-pane/imageEmbed";
import { Markup } from "./markup";

import style from "./QuoteMessage.module.css";

interface QuoteProps {
  message: Message;
  quote: Partial<RawMessage>;
  container: HTMLDivElement;
}

const QuoteHeader = (props: QuoteProps) => {
  return (
    <div class={style.quoteHeader}>
      <Link
        class={style.user}
        href={`/app/profile/${props.quote.createdBy?.id}`}
      >
        <Avatar user={props.quote.createdBy} size={18} />
        <span class={style.username}>{props.quote.createdBy!.username}</span>
      </Link>
    </div>
  );
};

export function QuoteMessage(props: QuoteProps) {
  const attachment = props.quote.attachments?.[0];

  const imageAttachment =
    attachment?.width || attachment?.mime?.startsWith("image/") == true;

  return (
    <div class={style.quoteContainer}>
      <QuoteHeader {...props} />
      <Markup
        class={style.markup}
        text={props.quote.content || ""}
        message={props.quote as Message}
        isQuote
      />
      {imageAttachment && (
        <ImageEmbed
          horizPadding={82}
          maxWidth={200}
          attachment={attachment}
          container={props.container}
        />
      )}
    </div>
  );
}

export function QuoteMessageInvalid() {
  return <div class={style.invalidQuote}>{t`Invalid Quote`}</div>;
}

export function QuoteMessageHidden() {
  return <span class={style.invalidQuote}>{t`Hidden Quote`}</span>;
}
