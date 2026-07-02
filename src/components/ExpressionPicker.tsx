import { t } from "@lingui/core/macro";

import { isMobileWidth } from "../config";
import { h } from "../h";
import { storeEmitter } from "../utils/EventEmitter";
import { portalElement } from "../utils/portal";
import { Button } from "./button";
import { createEmojiPicker } from "./EmojiPicker";

import style from "./ExpressionPicker.module.css";

interface ExpressionPickerProps {
  // onSelect: (expression: string) => void;
  targetEl: HTMLElement;
  defaultTab?: "GIFs" | "emojis";
  tabs?: ("GIFs" | "emojis")[];
}

let currentInstance: {
  targetEl: HTMLElement;
  destroy: () => void;
} | null = null;

export const createExpressionPicker = (props: ExpressionPickerProps) => {
  if (currentInstance) {
    const sameTarget = currentInstance.targetEl === props.targetEl;
    currentInstance.destroy();
    currentInstance = null;
    if (sameTarget) {
      return;
    }
  }

  let contentEl = (<div class={style.content}></div>) as HTMLDivElement;
  let tabs = props.tabs || ["GIFs", "emojis"];
  let currentTab = props.defaultTab || "emojis";
  const abortController = new AbortController();

  let currentPage: {
    abortController: AbortController;
    el: HTMLDivElement;
  } | null = null;

  const updatePage = () => {
    currentPage?.abortController.abort();
    if (currentTab === "emojis") {
      currentPage = createEmojiPicker();
      contentEl.replaceChildren(currentPage.el);
    }
  };
  updatePage();

  const footer = (
    <div class={style.footer}>
      {tabs?.map((tab) =>
        tab === "GIFs" ? (
          <Button
            class={style.button}
            data-name="GIFs"
            label={t`GIFs`}
            icon="gif"
            hoverBorder
          />
        ) : (
          <Button
            class={style.button}
            data-selected
            data-name="emojis"
            label={t`Emojis`}
            hoverBorder
            icon="face"
          />
        ),
      )}
    </div>
  ) as HTMLElement;

  const el = (
    <div class={style.expressionPicker}>
      {contentEl}
      {footer}
    </div>
  ) as HTMLElement;
  const updatePos = () => {
    const app = document.getElementById("app")!;
    const targetRect = props.targetEl.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (isMobileWidth()) {
      app.style.height = window.innerHeight - elRect.height + "px";
    }

    el.style.setProperty("--top", targetRect.top - elRect.height - 10 + "px");
    el.style.setProperty(
      "--left",
      targetRect.left - elRect.width + targetRect.width + "px",
    );
  };
  portalElement().appendChild(el);
  updatePos();

  window.addEventListener("resize", updatePos, {
    signal: abortController.signal,
    passive: true,
  });

  document.addEventListener(
    "click",
    (e) => {
      if (
        !el.contains(e.target as Node) &&
        !props.targetEl.contains(e.target as Node)
      ) {
        abortController.abort();
      }
    },
    { signal: abortController.signal },
  );

  abortController.signal.addEventListener("abort", () => {
    const app = document.getElementById("app")!;
    app.style.height = "";
    el.remove();
    if (currentInstance?.targetEl === props.targetEl) {
      currentInstance = null;
    }
  });

  storeEmitter.on(
    "drawer:modeChange",
    () => {
      abortController.abort();
    },
    abortController.signal,
  );

  footer.addEventListener(
    "click",
    (e) => {
      const button = (e.target as HTMLElement).closest("button");
      if (!button) return;
      const selectedTab = button.dataset.name as "GIFs" | "emojis";
      if (selectedTab === currentTab) return;

      const previousTab = currentTab;
      currentTab = selectedTab;

      footer
        .querySelector(`[data-name="${selectedTab}"]`)
        ?.setAttribute("data-selected", "true");
      footer
        .querySelector(`[data-name="${previousTab}"]`)
        ?.removeAttribute("data-selected");
      updatePage();
    },
    { signal: abortController.signal },
  );

  currentInstance = {
    targetEl: props.targetEl,
    destroy: () => abortController.abort(),
  };

  return {
    destroy: () => abortController.abort(),
  };
};
