import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h } from "../../h";
import { channelStore } from "../../store/channelStore";
import { messageMentionStore } from "../../store/messageMentionStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Button } from "../button";

const jumpToPresent = css`
  position: absolute;
  top: -48px;
  right: 0;
  &.hide {
    display: none;
  }
`;

const JumpToPresentButton = () => {
  const channelId = channelStore.currentChannelId!;
  const hasMention = messageMentionStore.mentions.get(channelId)?.count;

  const hasNewMessages =
    hasMention || channelStore.notificationsMemo.value()[channelId];

  return (
    <Button
      class="button"
      icon="keyboard_arrow_down"
      alert={!!hasNewMessages}
      label={hasNewMessages ? t`New Messages` : undefined}
    />
  );
};
export const createJumpToPresent = (opts: { signal: AbortSignal }) => {
  const el = (
    <div class={[jumpToPresent, "hide"]}>
      <JumpToPresentButton />
    </div>
  ) as HTMLElement;

  storeEmitter.on(
    "channel:scrolledToBottom",
    (isBottom) => {
      el.classList.toggle("hide", isBottom);
    },
    opts.signal,
  );

  const updateButton = () => el.replaceChildren(<JumpToPresentButton />);

  storeEmitter.on(
    "mention:dm_update",
    (event) => {
      if (event.channelId !== channelStore.currentChannelId) return;
      updateButton();
    },
    opts.signal,
  );

  storeEmitter.on(
    "channel:notify_update",
    (event) => {
      if (event.channelId !== channelStore.currentChannelId) return;
      updateButton();
    },
    opts.signal,
  );
  storeEmitter.on("navigate:channelId", updateButton, opts.signal);

  return el;
};
