import { css } from "@linaria/core";
import { h, Fragment } from "../../h";
import {
  addTextSpans,
  parseMarkup,
  UnreachableCaseError,
  type Entity,
  type Span,
} from "@nerimity/nevula";
import type { Message } from "../../store/messageStore";
import { userStore } from "../../store/userStore";
import { Mention } from "./Mention";
import { channelStore } from "../../store/channelStore";

const markup = css`
  line-height: 1.3;
  white-space: pre-wrap;

  .heading {
    margin-top: 4px;
    margin-bottom: 4px;
  }

  .bold {
    font-weight: bold;
  }

  .italic {
    font-style: italic;
  }

  .strikethrough {
    text-decoration: line-through;
  }

  .underline {
    text-decoration: underline;
  }
`;

export interface Props {
  text: string;
  inline?: boolean;
  message?: Message;
  animateEmoji?: boolean;
  class?: string;
  serverId?: string;
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
      return <span>#role-mention</span>;
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
        return <Mention label={expr} />;
      }

      break;
    }
    case "q": {
      return <span>#quote-mention</span>;
    }
    case "ace": // legacy animated custom emoji gif
    case "wace": // animated custom emoji webp
    case "ce": {
      // custom emoji
      // const [id, name] = expr.split(":");
      ctx.emojiCount += 1;
      // const animated = type === "ace";
      // const webpAnimated = type === "wace";
      // const shouldAnimate =
      //   (animated || webpAnimated) && ctx.props().animateEmoji === false
      //     ? "?type=webp"
      //     : "";
      return <span>emoji</span>;
    }
    case "link": {
      const [url, text] = expr.split("->").map((s) => s.trim());

      if (url && text) {
        ctx.textCount += text.length;
        return <span>link</span>;
      }
      break;
    }
    case "to": {
      ctx.textCount += expr.length;
      return <span>timestamp</span>;
    }
    case "tr": {
      const stamp = parseInt(expr);
      const date = new Date(stamp * 1000);
      if (isNaN(date as any)) {
        break;
      }
      ctx.textCount += expr.length;
      return <span>timestamp</span>;
    }
    case "ruby": {
      const output: any[] = [];
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
          class="gradient"
          style={{
            "background-image": `linear-gradient(0.25turn, ${colors.replaceAll("-", ",")})`,
          }}
          textContent={text}
        />
      );
    }
    case "vertical": {
      if (!ctx.props().inline) {
        const output = expr.split("  ").join("\n").trim();

        if (output.length > 0) {
          return <div class="vertical" textContent={output} />;
        }
      }
      break;
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
      return <span {...{ url }} />;
    }
    case "code": {
      return <code class={entity.type}>{transformEntities(entity, ctx)}</code>;
    }
    case "spoiler": {
      return <span>{transformEntities(entity, ctx)}</span>;
    }
    case "codeblock": {
      if (ctx.props().inline) {
        return <code class="code">{sliceText(ctx, entity.innerSpan)}</code>;
      }
      const lang = entity.params.lang;
      const value = sliceText(ctx, entity.innerSpan);
      return <span value={value} lang={lang} />;
    }
    case "blockquote": {
      return (
        <blockquote classList={{ inline: ctx.props().inline }}>
          {transformEntities(entity, ctx)}
        </blockquote>
      );
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
      // const url = entity.params.url;
      ctx.textCount += name.length;
      return <div>link</div>;
    }
    case "bold":
    case "italic":
    case "underline":
    case "strikethrough": {
      // todo: style folding when there's no before/after for dom memory usage optimization
      // if(beforeSpan.start === beforeSpan.end && afterSpan.start === afterSpan.end) {}
      return <span class={entity.type}>{transformEntities(entity, ctx)}</span>;
    }
    case "emoji_name": {
      return <div>emoji</div>;
    }
    case "emoji": {
      const emoji = sliceText(ctx, entity.innerSpan, { countText: false });
      ctx.emojiCount += 1;
      return (
        <span class="emoji" textContent={emoji}>
          {emoji}
        </span>
      );
    }
    case "heading": {
      const level = entity.params.level;
      const text = transformEntities(entity, ctx);
      ctx.textCount += text.length;
      if (ctx.props().inline) {
        return <span>{text}</span>;
      }
      return h(`h${level}`, { class: "heading" }, <>{text}</>);
    }
    case "custom": {
      return transformCustomEntity(entity, ctx);
    }
    default: {
      throw new UnreachableCaseError(entity as never);
    }
  }
}

// const commandRegex = /^(\/[^:\s]*):\d+( .*)?$/m;
export function Markup(props: Props) {
  const ctx = {
    props: () => ({
      ...props,
      text: props.text,
    }),
    emojiCount: 0,
    textCount: 0,
    quoteCount: 0,
  };

  const entity = addTextSpans(parseMarkup(ctx.props().text));

  const output = transformEntity(entity, ctx);

  const largeEmoji = () =>
    !ctx.props().inline && ctx.emojiCount <= 5 && ctx.textCount === 0;

  return (
    <span class={[markup, props.class, largeEmoji() && "largeEmoji"]}>
      {output}
    </span>
  );
}
