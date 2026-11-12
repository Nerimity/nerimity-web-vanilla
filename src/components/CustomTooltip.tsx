import { debounce } from "../utils/debounce";
import { closestFromEvent } from "../utils/dom";
import { portalElement } from "../utils/portal";
import { throttle } from "../utils/throttle";
import { userAgent } from "../utils/userAgent";

import style from "./CustomTooltip.module.css";

const dataAttribute = "[data-tooltip]";

export const handleCustomTooltip = (opts: { signal: AbortSignal }) => {
  if (userAgent.mobile) return;
  const el = (<div class={style.tooltip}>Tooltip</div>) as HTMLDivElement;

  portalElement().appendChild(el);

  let current: HTMLElement | null = null;

  const observer = new MutationObserver(() => {
    if (current && !current.isConnected) hide();
  });

  const hide = () => {
    observer.disconnect();
    current = null;
    el.style.display = "none";
  };

  const show = throttle((tooltip: HTMLElement) => {
    if (tooltip !== current || !tooltip.isConnected) return;
    const tooltipText = tooltip.dataset.tooltip;
    if (!tooltipText) return;

    el.textContent = tooltipText;
    el.style.display = "block";
    const rect = tooltip.getBoundingClientRect();
    const gap = 8;

    let left = rect.right + gap;
    if (left + el.offsetWidth > window.innerWidth) {
      left = rect.left - el.offsetWidth - gap;
    }

    const top = rect.top + rect.height / 2 - el.offsetHeight / 2;
    el.style.left = `${left}px`;
    el.style.top = `${Math.max(0, top)}px`;
  }, 150);

  document.addEventListener(
    "mouseover",
    (event) => {
      const tooltip = closestFromEvent(event, dataAttribute);
      if (tooltip === current) return;
      if (!tooltip) return hide();

      hide();
      current = tooltip;
      observer.observe(document.body, { childList: true, subtree: true });
      show(tooltip);
    },
    { signal: opts.signal },
  );

  document.addEventListener(
    "mouseout",
    (event) => {
      const related = event.relatedTarget;
      if (current && related instanceof Node && current.contains(related))
        return;
      hide();
    },
    { signal: opts.signal },
  );

  opts.signal.addEventListener("abort", () => {
    observer.disconnect();
    current = null;
    el.remove();
  });
};
