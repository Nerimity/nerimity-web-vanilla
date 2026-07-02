import { isMobileWidth } from "../config";
import { h } from "../h";
import { storeEmitter } from "../utils/EventEmitter";
import { portalElement } from "../utils/portal";
import { Input } from "./input";

import style from "./ExpressionPicker.module.css";

interface ExpressionPickerProps {
  // onSelect: (expression: string) => void;
  targetEl: HTMLElement;
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

  const abortController = new AbortController();

  const el = (
    <div class={style.expressionPicker}>
      <Input />
      Expression Picker
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

  currentInstance = {
    targetEl: props.targetEl,
    destroy: () => abortController.abort(),
  };

  return {
    destroy: () => abortController.abort(),
  };
};
