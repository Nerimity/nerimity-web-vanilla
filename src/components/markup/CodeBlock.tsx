import { css } from "@linaria/core";

import { h } from "../../h";
import { scoped } from "../../utils/css";
import { Button } from "../button";
import { SyntaxHighlighter } from "../SyntaxHighlighter";

const codeblock = css`
  margin-right: 2px;
  border-radius: var(--radius-4);
  overflow: hidden;
  border: 1px solid var(--gray-700);
  background-color: var(--gray-900);
  .${scoped`details`} {
    align-items: center;
    display: flex;
    padding: 4px;
    .${scoped`lang`} {
      font-size: 12px;
      color: var(--gray-400);
    }
    .buttons {
      display: flex;
      gap: 4px;
      margin-left: auto;
    }
    .button {
      padding: 4px;
      border-radius: var(--radius-3);
      .icon {
        font-size: 16px;
      }
    }
  }
  &.nowrap {
    .highlighter {
      overflow: auto;
    }
    pre {
      white-space: pre;
    }
  }
`;

export const CodeBlock = (props: { value: string; lang?: string }) => {
  const el = (
    <div class={[codeblock]}>
      <code class={scoped`details`}>
        <span class={scoped`lang`}>{props.lang || "text"}</span>
        <div class="buttons">
          <Button icon="wrap_text" class="button" data-action="wrap" />
          <Button icon="content_copy" class="button" data-action="copy" />
        </div>
      </code>
      <SyntaxHighlighter code={props.value} lang={props.lang} />
    </div>
  ) as HTMLElement;

  const details = el.querySelector(`.${scoped`details`}`) as HTMLElement;
  details.onclick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest(".button") as HTMLElement;
    const action = button.dataset.action;
    switch (action) {
      case "copy": {
        navigator.clipboard.writeText(props.value);
        break;
      }
      case "wrap": {
        el.classList.toggle("nowrap");
        break;
      }
    }
  };

  return el;
};
