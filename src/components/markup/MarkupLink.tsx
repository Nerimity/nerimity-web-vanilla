import { closestFromEvent } from "../../utils/dom";
import { addHttps } from "../../utils/url";
import { createLinkWarnModal } from "../modals/LinkWarnModal";
import { Link } from "../ui/link";

interface MarkupLink {
  name: string;
  url: string;
  class?: string;
}

export const MarkupLink = (props: MarkupLink) => {
  const safeUrl = addHttps(props.url);
  const warn = props.name !== safeUrl;

  let nerimityLink = safeUrl.startsWith("https://nerimity.com/app");
  nerimityLink = nerimityLink || safeUrl.startsWith("https://nerimity.com/bot");
  nerimityLink = nerimityLink || safeUrl.startsWith("https://nerimity.com/i");

  if (nerimityLink) {
    const path = safeUrl.replace("https://nerimity.com", "");
    return (
      <Link href={path} decoration class={props.class}>
        {props.name}
      </Link>
    );
  }

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
      const anchorEl = closestFromEvent<HTMLAnchorElement>(e, "a[data-warn]");
      if (anchorEl) {
        e.preventDefault();
        e.stopPropagation();
        const url = anchorEl.href;
        createLinkWarnModal(url);
      }
    },

    { signal },
  );
};
