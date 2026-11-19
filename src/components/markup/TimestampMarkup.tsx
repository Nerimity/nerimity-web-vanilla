import { addReminder } from "../../services/reminderService";
import { accountStore } from "../../store/accountStore";
import {
  formatTimestamp,
  formatTimestampOffset,
  formatTimestampRelative,
} from "../../utils/date";
import { closestFromEvent } from "../../utils/dom";
import { createTimeModal } from "../modals/TimeModal";
import { alert } from "../ui/modal";
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

  opts.el.addEventListener(
    "click",
    (e) => {
      const timestampMention = closestFromEvent(
        e,
        `[data-type="tr"][data-timestamp-mention]`,
      );
      if (!timestampMention) return;

      const postEl = closestFromEvent(e, "[data-post-id]");
      const messageEl = closestFromEvent(e, "[data-message-id]");
      if (messageEl || postEl) {
        const messageId = messageEl?.dataset.messageId;
        const postId = postEl?.dataset.postId;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (
          accountStore.currentUser?.reminders.find((r) => {
            if (postId) return postId === r.post?.id;
            return messageId === r.message?.id;
          })
        ) {
          alert({ message: "Reminder Already Exists." });
          return;
        }

        createTimeModal({
          defaultTimestamp: parseInt(timestampMention.dataset.timestamp!),
          mode: "RELATIVE",
          onConfirm(event) {
            if (event.type !== "tr") return;
            const timestamp = event.val * 1000;
            addReminder({ timestamp, messageId, postId }).then(([, err]) => {
              if (err) alert({ message: err.message });
            });
          },
        });
      }
    },
    { signal: opts.signal },
  );

  opts.signal.addEventListener(
    "abort",
    () => {
      clearInterval(intervalId);
    },
    { once: true },
  );
};
