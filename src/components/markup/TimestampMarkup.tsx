import {
  formatTimestamp,
  formatTimestampOffset,
  formatTimestampRelative,
} from "../../utils/date";
import { Mention } from "./Mention";

export const TimestampType = {
  tr: "RELATIVE",
  to: "OFFSET",
};

export const TimestampMarkup = (props: {
  type: keyof typeof TimestampType;
  timestamp: number | string;
}) => {
  const itemEl = (
    <Mention
      data-timestamp-mention
      data-type={props.type}
      data-timestamp={props.timestamp}
      label=""
      icon="schedule"
      title={
        props.type === "tr"
          ? formatTimestamp(
              typeof props.timestamp === "string"
                ? parseInt(props.timestamp!)
                : props.timestamp,
            )
          : undefined
      }
    />
  ) as HTMLDivElement;
  updateItem(itemEl);
  return itemEl;
};

const updateItem = (item: HTMLDivElement) => {
  const { type, timestamp } = item.dataset;

  const text = item.querySelector(".text") as HTMLDivElement;
  if (type === "tr") {
    text.innerText = formatTimestampRelative(parseInt(timestamp!));
  }
  if (type === "to") {
    text.innerText = formatTimestampOffset(timestamp ?? "");
  }
};

const updateAll = (el: HTMLElement) => {
  const items = el.querySelectorAll("[data-timestamp-mention]");
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as HTMLDivElement;
    updateItem(item);
  }
};

export const handleTimestampMarkupEvents = (opts: {
  el: HTMLElement;
  signal: AbortSignal;
}) => {
  updateAll(opts.el);
  const intervalId = setInterval(() => updateAll(opts.el), 1000);

  opts.signal.addEventListener(
    "abort",
    () => {
      clearInterval(intervalId);
    },
    { once: true },
  );
};
