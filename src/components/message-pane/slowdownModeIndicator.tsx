import { t } from "@lingui/core/macro";

import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { MessageType } from "../../Types";
import { formatMillisRemainingNarrow } from "../../utils/date";
import { storeEmitter } from "../../utils/EventEmitter";
import { RolePermissionFlag } from "../../utils/RolePermissionFlag";
import { Icon } from "../icon";

import style from "./slowdownModeIndicator.module.css";

export const createSlowdownModeIndicator = (opts: { signal: AbortSignal }) => {
  let slowdownMode: number | undefined = 0;

  let iconEl = (<Icon name="schedule" />) as HTMLDivElement;
  let textEl = (<span>{t`Slow Mode`}</span>) as HTMLSpanElement;
  let intervalId: number | undefined;
  let intervalChannelId: string | null = null;

  let el = (
    <div class={[style.slowdownModeIndicator, style.hide]}>
      {iconEl}
      {textEl}
    </div>
  ) as HTMLElement;

  const clearCountdown = () => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
      intervalChannelId = null;
    }
  };

  const isAdmin = (serverId?: string) => {
    if (!serverId) return false;
    const member = serverMemberStore.currentMember(serverId);
    return !!member?.hasPerm(RolePermissionFlag.admin.bit);
  };
  const updateCountdown = () => {
    const channelId = channelStore.currentChannelId;
    const channel = channelStore.currentChannel();
    const slowdownProperty = channelId
      ? channelStore.getProperty(channelId)?.slowDownMode
      : undefined;
    if (slowdownProperty && isAdmin(channel?.serverId)) {
      channelStore.setProperty(channelId!, { slowDownMode: undefined });
      return;
    }
    if (!slowdownProperty || !channelId) {
      iconEl.classList.remove(style.countdown!);
      clearCountdown();
      textEl.textContent = t`Slow Mode`;
      return;
    }

    const remaining =
      slowdownProperty.ttl - (Date.now() - slowdownProperty.startedAt);
    iconEl.classList.toggle(style.countdown!, remaining > 0);
    if (remaining <= 0) {
      clearCountdown();
      channelStore.setProperty(channelId, { slowDownMode: undefined });
      return;
    }

    textEl.textContent = `${Math.ceil(remaining / 1000)}s`;
    if (intervalId === undefined || intervalChannelId !== channelId) {
      clearCountdown();
      intervalChannelId = channelId;
      intervalId = window.setInterval(updateCountdown, 1000);
    }
  };

  const render = () => {
    const channel = channelStore.currentChannel();
    slowdownMode = channel?.slowModeSeconds;

    el.classList.toggle(style.hide!, !slowdownMode);

    if (!slowdownMode) {
      el.replaceChildren();
      clearCountdown();
      return;
    }

    const toReadable = formatMillisRemainingNarrow(slowdownMode * 1000);
    el.replaceChildren(
      <div class={style.container} title={toReadable}>
        {iconEl}
        {textEl}
      </div>,
    );
    updateCountdown();
  };

  render();

  storeEmitter.on("ws:authStateUpdate", render, opts.signal);
  storeEmitter.on("navigate:channelId", render, opts.signal);
  storeEmitter.on(
    "channel:property_updated",
    (event) => {
      if (event.channelId !== channelStore.currentChannelId) return;
      if (!("slowDownMode" in event.updated)) return;
      render();
    },
    opts.signal,
  );
  storeEmitter.on(
    "channel:property_updated",
    (event) => {
      if (event.channelId !== channelStore.currentChannelId) return;
      if (!("slowModeSeconds" in event.updated)) return;

      render();
    },
    opts.signal,
  );

  storeEmitter.on(
    "message:created_raw",
    (event) => {
      if (event.createdBy.id !== accountStore.currentUser?.id) return;
      if (!slowdownMode) return;
      if (event.channelId !== channelStore.currentChannelId) return;
      if (event.type !== MessageType.CONTENT) return;

      if (isAdmin(channelStore.currentChannel()?.serverId)) return;

      channelStore.setProperty(event.channelId, {
        slowDownMode: {
          ttl: slowdownMode * 1000,
          startedAt: event.createdAt,
        },
      });

      render();
    },
    opts.signal,
  );

  opts.signal.addEventListener(
    "abort",
    () => {
      clearCountdown();
      textEl.remove();
      (textEl as any) = null;
      iconEl.remove();
      (iconEl as any) = null;
      el.remove();
      (el as any) = null;
    },
    { once: true },
  );

  return el;
};
