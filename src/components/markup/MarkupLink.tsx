import { h } from "../../h";
import { addHttps } from "../../utils/url";
import { LinkWarnModal } from "../LinkWarnModal";
import { createModal } from "../modal";

interface MarkupLink {
  name: string;
  url: string;
}

export const MarkupLink = (props: MarkupLink) => {
  const safeUrl = addHttps(props.url);
  const warn = props.name !== safeUrl;
  return (
    <a href={safeUrl} target="_blank" data-warn={warn}>
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
          const abortController = new AbortController();
          createModal(() => <LinkWarnModal url={url} />, abortController);
        }
      }
    },
    { signal },
  );
};
