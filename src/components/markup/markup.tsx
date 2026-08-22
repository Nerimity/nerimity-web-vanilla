import {
  addTextSpans,
  parseMarkup,
  UnreachableCaseError,
  type Entity,
  type Span,
} from "@nerimity/nevula";

import { h } from "../../h";
import { channelStore } from "../../store/channelStore";
import type { Message } from "../../store/messageStore";
import { serverRoleStore } from "../../store/serverRoleStore";
import { serverStore } from "../../store/serverStore";
import { userStore } from "../../store/userStore";
import { shortcodeToUnicode, unicodeToShortcode } from "../../utils/emojis";
import { Timezones } from "../../utils/Timezones";
import { Checkbox } from "../checkbox";
import { Icon } from "../icon";
import { CodeBlock } from "./CodeBlock";
import { Emoji, handleMarkupEmojiClick } from "./Emoji";
import { MarkupLink } from "./MarkupLink";
import { Mention } from "./Mention";
import {
  QuoteMessage,
  QuoteMessageHidden,
  QuoteMessageInvalid,
} from "./QuoteMessage";
import {
  handleTimestampMarkupEvents,
  TimestampMarkup,
} from "./TimestampMarkup";

import style from "./markup.module.css";

export interface Props {
  text: string;
  inline?: boolean;
  message?: Message;
  animateInitialOnFocus?: boolean;
  animateEmoji?: boolean;
  class?: string | (string | boolean | undefined)[];
  serverId?: string | null;
  replaceCommandBotId?: boolean;
  isQuote?: boolean;
  container?: HTMLDivElement;
  canEditCheckboxes?: boolean;
}

type RenderContext = {
  props: () => Props;
  textCount: number;
  emojiCount: number;
  quoteCount: number;
};

const transformEntities = (entity: Entity, ctx: RenderContext) =>
  entity.entities.map((e) => transformEntity(e, ctx));

const sliceText = (
  ctx: RenderContext,
  span: Span,
  { countText = true } = {},
) => {
  const text = ctx.props().text.slice(span.start, span.end);
  if (countText && !/^\s+$/.test(text)) {
    ctx.textCount += text.length;
  }
  return text;
};

type CustomEntity = Entity & { type: "custom" };

// const TimeOffsetRegex = /^[+-]\d{4}$/;

const HexColorRegex = /#(?:[a-fA-F0-9]{3,4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})/;
const CustomColorExprRegex = new RegExp(
  "^(?<colors>" +
    HexColorRegex.source +
    "(?:-" +
    HexColorRegex.source +
    ")+)" +
    /\s+(?<text>.*)$/.source,
);

const markupCheckbox = new WeakMap<
  HTMLElement,
  { message: Message; entity: Entity }
>();

const TimeOffsetRegex = /^[+-]\d{4}$/;

function transformCustomEntity(entity: CustomEntity, ctx: RenderContext) {
  const type = entity.params.type;
  const expr = sliceText(ctx, entity.innerSpan, { countText: false });
  switch (type) {
    case "#": {
      const channel = channelStore.channels.get(expr);
      if (channel && channel.serverId) {
        ctx.textCount += expr.length;
        return <Mention channel={channel} icon="tag" />;
      }
      break;
    }
    // Role mentions
    case "r": {
      const role = serverRoleStore.roles
        .get(serverStore.currentServerId!)
        ?.get(expr);
      if (role) {
        ctx.textCount += expr.length;
        return <Mention role={role} />;
      }
      break;
    }
    case "@": {
      const message = ctx.props().message;
      const user =
        userStore.users.get(expr) ||
        message?.mentions?.find((u) => u.id === expr);
      const everyoneOrSomeone = ["e", "s"].includes(expr);
      if (user) {
        ctx.textCount += expr.length;
        return <Mention user={user} />;
      }
      if (everyoneOrSomeone) {
        ctx.textCount += expr.length;
        return (
          <Mention
            icon="alternate_email"
            label={expr === "e" ? "everyone" : "someone"}
          />
        );
      }

      break;
    }
    case "q": {
      const props = ctx.props();
      const message = props.message;

      if (ctx.quoteCount >= 10) {
        break;
      }

      if (props.isQuote || props.inline) {
        return <QuoteMessageHidden />;
      }

      const quote = message?.quotedMessages?.find((m) => m.id === expr);

      if (!quote) {
        return <QuoteMessageInvalid />;
      }

      ctx.quoteCount += 1;

      return (
        <QuoteMessage
          container={props.container!}
          message={message!}
          quote={quote}
        />
      );
    }
    case "ace": // legacy animated custom emoji gif
    case "wace": // animated custom emoji webp
    case "ce": {
      // custom emoji
      const [id, name] = expr.split(":");
      ctx.emojiCount += 1;
      const animated = type === "ace";
      const webpAnimated = type === "wace";
      const url = `${id}${animated && !webpAnimated ? ".gif" : ".webp" + (webpAnimated ? "#a" : "")}`;

      return (
        <Emoji icon={url} title={name} animate={ctx.props().animateEmoji} />
      );
    }
    case "link": {
      const [url, text] = expr.split("->").map((s) => s.trim());

      if (url && text) {
        ctx.textCount += text.length;
        return <MarkupLink name={text} url={url} />;
      }
      break;
    }
    case "to": {
      const isValidTimezone = Timezones.includes(expr);
      const isValidRegex = TimeOffsetRegex.test(expr);
      if (!isValidTimezone && !isValidRegex) {
        break;
      }
      ctx.textCount += expr.length;

      return <TimestampMarkup type={type} timestamp={expr} />;
    }
    case "tr": {
      const stamp = parseInt(expr);
      const date = new Date(stamp * 1000);
      if (isNaN(date as any)) {
        break;
      }
      ctx.textCount += expr.length;
      return <TimestampMarkup type={type} timestamp={stamp * 1000} />;
    }
    case "ruby": {
      const output: Node[] = [];
      const matches = expr.matchAll(/(.+?)\((.*?)\)/g);
      for (const match of matches) {
        const text = match[1]!.trim();
        const annotation = match[2]!.trim();

        output.push(
          <span>{text}</span>,
          <rp>(</rp>,
          <rt>{annotation}</rt>,
          <rp>)</rp>,
        );
      }
      if (output.length > 0) {
        return <ruby>{output}</ruby>;
      }
      break;
    }
    case "gradient": {
      const { colors, text } =
        expr.trim().match(CustomColorExprRegex)?.groups ?? {};
      if (colors == null || text == null) break;

      return (
        <span
          class={style.gradient}
          style={{
            "background-image": `linear-gradient(0.25turn, ${colors.replaceAll("-", ",")})`,
          }}
        >
          {text}
        </span>
      );
    }
    case "vertical": {
      if (!ctx.props().inline) {
        const output = expr.split("  ").join("\n").trim();

        if (output.length > 0) {
          return <div class={style.vertical}>{output}</div>;
        }
      }
      break;
    }
    case "cmd": {
      const [name, id] = expr.split(":");
      return (
        <Mention monospace user={userStore.users.get(id!)} label={`/${name}`} />
      );
    }
    default: {
      console.warn("Unknown custom entity:", type);
    }
  }
  return <span>{sliceText(ctx, entity.outerSpan)}</span>;
}

function transformEntity(entity: Entity, ctx: RenderContext): any {
  switch (entity.type) {
    case "text": {
      if (entity.entities.length > 0) {
        return <span>{transformEntities(entity, ctx)}</span>;
      } else {
        return <span>{sliceText(ctx, entity.innerSpan)}</span>;
      }
    }
    case "link": {
      const url = sliceText(ctx, entity.innerSpan);
      return <MarkupLink name={url} url={url} />;
    }
    case "code": {
      return <code class={style.code}>{transformEntities(entity, ctx)}</code>;
    }
    case "spoiler": {
      return (
        <span class={style.spoiler}>
          <span class={style.innerSpoiler}>
            {transformEntities(entity, ctx)}
          </span>
        </span>
      );
    }
    case "codeblock": {
      if (ctx.props().inline) {
        return (
          <code class={style.code}>{sliceText(ctx, entity.innerSpan)}</code>
        );
      }
      const lang = entity.params.lang;
      const value = sliceText(ctx, entity.innerSpan);
      return <CodeBlock value={value} lang={lang?.toLowerCase()} />;
    }
    case "blockquote": {
      return (
        <blockquote class={[ctx.props().inline && style.inline]}>
          {transformEntities(entity, ctx)}
        </blockquote>
      );
    }
    case "checkbox": {
      const { checked } = entity.params;
      const props = ctx.props();

      const checkbox = (
        <Checkbox.Root
          class={style.checkbox}
          checked={checked}
          disabled={!props.canEditCheckboxes}
        >
          <Checkbox.Box />
        </Checkbox.Root>
      ) as HTMLDivElement;

      if (props.message) {
        markupCheckbox.set(checkbox, {
          message: props.message,
          entity: entity,
        });
      }

      return checkbox;
    }

    case "color": {
      const { color } = entity.params;
      const lastCount = ctx.textCount;
      let el: any;

      if (color.startsWith("#")) {
        el = <span style={{ color }}>{transformEntities(entity, ctx)}</span>;
      } else {
        el = transformEntities(entity, ctx);
      }

      if (lastCount !== ctx.textCount) {
        return el;
      } else {
        return sliceText(ctx, entity.outerSpan);
      }
    }
    case "named_link": {
      const name = entity.params.name;
      const url = entity.params.url;
      ctx.textCount += name.length;
      return <MarkupLink name={name} url={url} />;
    }
    case "bold":
    case "italic":
    case "underline":
    case "strikethrough": {
      // todo: style folding when there's no before/after for dom memory usage optimization
      // if(beforeSpan.start === beforeSpan.end && afterSpan.start === afterSpan.end) {}
      return (
        <span class={style[entity.type]}>{transformEntities(entity, ctx)}</span>
      );
    }
    case "emoji_name": {
      const name = sliceText(ctx, entity.innerSpan, { countText: false });

      const unicode = shortcodeToUnicode[name];
      if (unicode) {
        ctx.emojiCount += 1;
        return (
          <Emoji
            icon={unicode}
            title={name}
            animate={ctx.props().animateEmoji}
          />
        );
      }

      return <span>:{name}:</span>;
    }
    case "emoji": {
      const unicode = sliceText(ctx, entity.innerSpan, { countText: false });

      const title = unicodeToShortcode[unicode];
      if (title) {
        ctx.emojiCount += 1;
        return (
          <Emoji
            icon={unicode}
            title={title}
            animate={ctx.props().animateEmoji}
          />
        );
      }

      return <span>{unicode}</span>;
    }
    case "heading": {
      const level = entity.params.level;
      const text = transformEntities(entity, ctx);
      ctx.textCount += text.length;
      if (ctx.props().inline) {
        return <span>{text}</span>;
      }
      return h(`h${level}`, { class: style.heading }, <>{text}</>);
    }
    case "custom": {
      return transformCustomEntity(entity, ctx);
    }
    default: {
      throw new UnreachableCaseError(entity as never);
    }
  }
}

const commandRegex = /^\/([^:\s]*):(\d+)( .*)?$/m;
export function Markup(props: Props) {
  const ctx = {
    props: () => ({
      ...props,
      text: props.replaceCommandBotId
        ? props.text.replace(commandRegex, "[cmd:$1:$2]$3")
        : props.text,
      animateEmoji: props.animateInitialOnFocus ? document.hasFocus() : false,
    }),
    emojiCount: 0,
    textCount: 0,
    quoteCount: 0,
  };

  const entity = addTextSpans(parseMarkup(ctx.props().text));

  const output = transformEntity(entity, ctx);

  const largeEmoji =
    !ctx.props().inline && ctx.emojiCount <= 5 && ctx.textCount === 0;

  return (
    <span class={[style.markup, props.class, largeEmoji && style.largeEmoji]}>
      {output}
      {props.message?.editedAt ? <Icon class={style.edit} name="edit" /> : null}
    </span>
  );
}

export function handleMarkupEvents(opts: {
  el: HTMLDivElement;
  onCheckboxChange: (event: { message: Message; content: string }) => void;
  signal: AbortSignal;
}) {
  const { el, onCheckboxChange, signal } = opts;

  handleMarkupEmojiClick({
    el,
    signal,
  });

  handleTimestampMarkupEvents({ el, signal });
  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const spoiler = target.closest("." + style.spoiler);
      if (spoiler) {
        spoiler.classList.add(style.spoil!);
      }
    },
    { signal },
  );

  handleMarkupCheckboxClick({ el, onChange: onCheckboxChange, signal });
}
function handleMarkupCheckboxClick(opts: {
  el: HTMLDivElement;
  onChange: (event: { message: Message; content: string }) => void;
  signal: AbortSignal;
}) {
  Checkbox.createHandler({
    ...opts,
    disableUpdateState: true,
    onChange(state, el) {
      const data = markupCheckbox.get(el);
      if (!data) return;

      const text = data.message.content ?? "";
      const before = text.slice(0, data.entity.outerSpan.start);
      const checkbox = `-[${state ? "x" : " "}]`;
      const after = text.slice(data.entity.outerSpan.end, text.length);
      const content = `${before}${checkbox}${after}`;
      opts.onChange({ message: data.message, content });
    },
  });
}
