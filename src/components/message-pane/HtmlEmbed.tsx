import { cdnUrl } from "../../config";
import { Dynamic } from "../../dynamic";
import { type HtmlNode } from "../../Types";
import { Markup } from "../markup/markup";

const htmlEmbedContainerStyles = {
  position: "relative",
  display: "flex",
  overflow: "auto",
  "align-self": "normal",
  "max-height": "500px",
  contain: "layout",
};

let nextEmbedId = 0;

const splitSelectors = (selectorText: string) => {
  const selectors: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";

  for (let i = 0; i < selectorText.length; i++) {
    const char = selectorText[i];
    if (quote) {
      if (char === quote && selectorText[i - 1] !== "\\") quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(" || char === "[") {
      depth++;
    } else if (char === ")" || char === "]") {
      depth--;
    } else if (char === "," && depth === 0) {
      selectors.push(selectorText.slice(start, i).trim());
      start = i + 1;
    }
  }

  selectors.push(selectorText.slice(start).trim());
  return selectors.filter(Boolean);
};

const scopeSelector = (selector: string, scope: string) => {
  if (selector === "*") return `${scope}, ${scope} *`;
  const rootSelector = /^(?:html|body|:root)/i;
  const rootMatch = rootSelector.exec(selector);
  const nextCharacter = rootMatch && selector[rootMatch[0].length];
  if (
    rootMatch &&
    (!nextCharacter || /[\s>+~.#:\x5b\x5d]/.test(nextCharacter))
  ) {
    return selector.replace(rootSelector, scope);
  }
  return `${scope} ${selector}`;
};

const scopeEmbedStyles = (cssText: string, scope: string) => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);

  const processRules = (rules: CSSRuleList): string[] =>
    Array.from(rules).flatMap((rule) => {
      if (rule instanceof CSSStyleRule) {
        const selector = splitSelectors(rule.selectorText)
          .map((item) => scopeSelector(item, scope))
          .join(", ");
        return [`${selector} { ${rule.style.cssText} }`];
      }

      if (
        rule.type === CSSRule.MEDIA_RULE ||
        rule.type === CSSRule.SUPPORTS_RULE
      ) {
        const nestedRules = processRules((rule as CSSGroupingRule).cssRules);
        if (!nestedRules.length) return [];
        const header = rule.cssText.slice(0, rule.cssText.indexOf("{")).trim();
        return [`${header} { ${nestedRules.join("\n")} }`];
      }

      return [];
    });

  return processRules(sheet.cssRules).join("\n");
};

export const HtmlEmbed = (props: { htmlEmbed: HtmlNode[] | HtmlNode }) => {
  const embed = Array.isArray(props.htmlEmbed)
    ? (props.htmlEmbed as HtmlNode[])
    : [props.htmlEmbed as HtmlNode];

  const styleItem = embed.find?.((item) => item?.tag === "style")
    ?.content[0] as string | undefined;

  const container = document.createElement("div");
  Object.assign(container.style, {
    position: htmlEmbedContainerStyles.position,
    display: htmlEmbedContainerStyles.display,
    overflow: htmlEmbedContainerStyles.overflow,
    alignSelf: htmlEmbedContainerStyles["align-self"],
    maxHeight: htmlEmbedContainerStyles["max-height"],
    contain: htmlEmbedContainerStyles.contain,
  });

  const scope = `html-embed-${++nextEmbedId}`;
  container.classList.add(scope);

  if (styleItem) {
    try {
      const embedStyle = document.createElement("style");
      embedStyle.textContent = scopeEmbedStyles(
        replaceImageUrl(styleItem, false),
        `.${scope}`,
      );
      container.append(embedStyle);
    } catch (error) {
      console.warn("Unable to parse HTML embed styles", error);
    }
  }

  container.append(<HTMLEmbedItem items={embed} />);

  return container;
};

const replaceImageUrl = (val: string, shouldAnimate: boolean) => {
  const regex = /url\((.*?)\)/gim;
  const regex2 = /url\((.*?)\)/im;

  return val.replaceAll(regex, (r) => {
    let url = regex2.exec(r)?.[1];
    if (!url) return r;
    if (url.startsWith('"') || url.startsWith("'")) {
      url = url.slice(1, -1);
    }
    return `url("${
      cdnUrl +
      "proxy/" +
      encodeURIComponent(url) +
      "/b" +
      (shouldAnimate ? "" : "?type=webp")
    }")`;
  });
};

const cleanAttributes = (item: HtmlNode, animate: boolean) => {
  if (!item?.attributes) return undefined;
  const attributes = { ...item.attributes };
  if (attributes.href) {
    if (
      !attributes.href.startsWith("http://") &&
      !attributes.href.startsWith("https://")
    ) {
      attributes.href = "#";
    }
  }
  if (attributes.style) {
    attributes.style = replaceImageUrl(attributes.style, !!animate);
  }
  if (attributes.src) {
    attributes.src =
      cdnUrl +
      "proxy/" +
      encodeURIComponent(attributes.src) +
      "/b" +
      (animate ? "" : "?type=webp");
  }
  return attributes;
};
const replaceEscaped = (str: string) => {
  return str
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
};

function HTMLEmbedItem(props: {
  items: HtmlNode[] | string[];
  animate?: boolean;
}) {
  return (
    <>
      {props.items.map((item) => (
        <>
          {typeof item === "string" ? (
            <Markup text={replaceEscaped(item as string)} />
          ) : (item as HtmlNode)?.tag === "style" ? (
            <></>
          ) : (
            <Dynamic
              component={(item as HtmlNode)?.tag}
              {...cleanAttributes(item as HtmlNode, !!props.animate)}
              {...(item.tag === "a"
                ? {
                    target: "_blank",
                    "data-warn": true,
                  }
                : {})}
            >
              {(item as HtmlNode).content?.map((content) => (
                <>
                  {typeof content === "string" ? (
                    <Markup
                      text={replaceEscaped(content as string) as string}
                    />
                  ) : (content as HtmlNode)?.tag === "style" ? (
                    <></>
                  ) : (
                    <HTMLEmbedItem
                      animate={props.animate}
                      items={[content as HtmlNode]}
                    />
                  )}
                </>
              ))}
            </Dynamic>
          )}
        </>
      ))}
    </>
  );
}
