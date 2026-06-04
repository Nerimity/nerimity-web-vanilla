import { css } from "@linaria/core";

import { h } from "../h";

const highlighter = css`
  display: block;
  word-break: break-word;
  width: 100%;
  padding: 6px;

  pre {
    white-space: pre-wrap;
    margin: 0;
  }
`;

const hash = (str: string) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
};

export function SyntaxHighlighter(props: { code: string; lang?: string }) {
  const id = `codeblock-${props.lang || "text"}-${hash(props.code)}`;

  const el = (
    <code id={id} class={[highlighter, "highlighter"]}>
      {props.code}
    </code>
  ) as HTMLElement;

  if (!props.lang) return el;

  import("../utils/shiki").then(({ highlight }) => {
    highlight(props.code, props.lang!).then((html) => {
      if (!html) return;
      const live = document.getElementById(id) ?? el;
      live.innerHTML = html;
      live.querySelector("pre")?.style.removeProperty("background");
    });
  });

  return el;
}
