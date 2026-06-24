import { h } from "../../h";
import { addHttps } from "../../utils/url";
import { createLinkWarnModal } from "../LinkWarnModal";

interface MarkupLink {
  name: string;
  url: string;
  class?: string;
}

export const MarkupLink = (props: MarkupLink) => {
  const safeUrl = addHttps(props.url);
  const warn = props.name !== safeUrl;
  return (
    <a href={safeUrl} class={props.class} target="_blank" data-warn={warn}>
      {props.name}
    </a>
  );
};

export const handleDangerLink = (signal: AbortSignal) => {
  document.addEventListener(
    "click",
    (e) => {
      if (e.target instanceof Element) {
        const anchorEl = e.target.closest("a[data-warn]") as HTMLAnchorElement;
        if (anchorEl) {
          e.preventDefault();
          e.stopPropagation();
          const url = anchorEl.href;
          createLinkWarnModal(url);
        }
      }
    },
    { signal },
  );
};
