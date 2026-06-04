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
export function SyntaxHighlighter(props: { code: string; lang?: string }) {
  const el = (
    <code class={[highlighter, "highlighter"]}>{props.code}</code>
  ) as HTMLElement;

  if (!props.lang) return el;

  import("../utils/shiki").then(({ highlight }) => {
    highlight(props.code, props.lang!).then((html) => {
      if (!html) return;
      el.innerHTML = html;
      el.querySelector("pre")?.style.removeProperty("background");
    });
  });

  return el;
}
