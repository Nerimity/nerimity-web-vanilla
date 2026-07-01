import { t } from "@lingui/core/macro";

import { cdnUrl } from "../../config";
import { Dynamic } from "../../dynamic";
import { h, Fragment } from "../../h";
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

const supportsScopeRule = (() => {
  try {
    const sheet = new CSSStyleSheet();
    sheet.insertRule("@scope { }");
    return true;
  } catch {
    return false;
  }
})();

export const HtmlEmbed = (props: { htmlEmbed: HtmlNode[] | HtmlNode }) => {
  if (!supportsScopeRule)
    return <div>{t`Embed not supported by your browser.`}</div>;
  const embed = Array.isArray(props.htmlEmbed)
    ? (props.htmlEmbed as HtmlNode[])
    : [props.htmlEmbed as HtmlNode];

  const styleItem = embed.find?.((item) => item?.tag === "style")
    ?.content[0] as string | undefined;

  return (
    <div style={htmlEmbedContainerStyles}>
      <HTMLEmbedItem items={embed} />
      {styleItem && (
        <style>{`@scope { 
          ${replaceImageUrl(styleItem, false)}}`}</style>
      )}
    </div>
  );
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
