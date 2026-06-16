import { h } from "../../h";
import { Button } from "../button";
import { SyntaxHighlighter } from "../SyntaxHighlighter";

import style from "./CodeBlock.module.css";

export const CodeBlock = (props: { value: string; lang?: string }) => {
  const el = (
    <div class={style.codeblock}>
      <code class={style.details}>
        <span class={style.lang}>{props.lang || "text"}</span>
        <div class={style.buttons}>
          <Button icon="wrap_text" class={style.button} data-action="wrap" />
          <Button icon="content_copy" class={style.button} data-action="copy" />
        </div>
      </code>
      <SyntaxHighlighter code={props.value} lang={props.lang} />
    </div>
  ) as HTMLElement;

  const details = el.querySelector(`.${style.details}`) as HTMLElement;
  details.onclick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest(`.${style.button}`) as HTMLElement;
    const action = button.dataset.action;
    switch (action) {
      case "copy": {
        navigator.clipboard.writeText(props.value);
        break;
      }
      case "wrap": {
        el.classList.toggle(style.nowrap!);
        break;
      }
    }
  };

  return el;
};
