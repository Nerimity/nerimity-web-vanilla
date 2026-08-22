import { t } from "@lingui/core/macro";

import { channelStore } from "../../store/channelStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { userStore } from "../../store/userStore";
import type { RawMessage } from "../../Types";
import { createEventEmitter, storeEmitter } from "../../utils/EventEmitter";
import { Avatar } from "../avatar";
import { Icon } from "../icon";

import style from "./typingIndicator.module.css";

export const typingEmitter = createEventEmitter<{
  "typing:update": Record<string, string[]>; // payload[channelId] = userIds[]
}>();

// typingEmitter.emit("typing:update", {})

const createHandleTypingIndicator = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  let channelIds: string[] = [];

  // typingUser[channelId][userId] = timestamp
  const typingUsers: Map<string, Map<string, number>> = new Map();

  const getChannelIds = () => {
    const currentChannelId = channelStore.currentChannelId;
    if (currentChannelId && !channelIds.includes(currentChannelId)) {
      return [...channelIds, currentChannelId];
    }
    return channelIds;
  };

  const buildTypingSnapshot = () => {
    const res: Record<string, string[]> = {};

    [...typingUsers.entries()].forEach(([channelId, users]) => {
      [...users.keys()].forEach((userId) => {
        if (!res[channelId]) res[channelId] = [];
        res[channelId].push(userId);
      });
    });
    return res;
  };

  const emit = () => {
    typingEmitter.emit("typing:update", buildTypingSnapshot());
  };

  const handleTyping = (payload: { channelId: string; userId: string }) => {
    if (!getChannelIds().includes(payload.channelId)) return;

    let users = typingUsers.get(payload.channelId);
    if (!users) {
      users = new Map<string, number>();
      typingUsers.set(payload.channelId, users);
    }

    const isNew = !users.has(payload.userId);
    users.set(payload.userId, Date.now());

    if (isNew) emit();
  };

  const TYPING_TIMEOUT = 5000;

  setInterval(() => {
    const now = Date.now();
    let changed = false;

    for (const [channelId, users] of typingUsers) {
      for (const [userId, timestamp] of users) {
        if (now - timestamp >= TYPING_TIMEOUT) {
          users.delete(userId);
          changed = true;
        }
      }
      if (!users.size) {
        typingUsers.delete(channelId);
      }
    }

    if (changed) emit();
  }, 5000);

  const handleMessageCreated = (payload: RawMessage) => {
    if (!getChannelIds().includes(payload.channelId)) return;

    const users = typingUsers.get(payload.channelId);

    const hadUser = users?.delete(payload.createdBy?.id);
    if (!users?.size) {
      typingUsers.delete(payload.channelId);
    }

    if (hadUser) emit();
  };

  storeEmitter.on("channel:typing", handleTyping, signal);
  storeEmitter.on("message:updated_raw", handleMessageCreated, signal);
  storeEmitter.on("message:created_raw", handleMessageCreated, signal);

  const updateChannelIds = (newChannelIds: string[]) => {
    channelIds = newChannelIds;
  };

  return { updateChannelIds, typingUsers, buildTypingSnapshot };
};

export const handleTypingIndicator = createHandleTypingIndicator();

export const createTypingIndicator = (abortController: AbortController) => {
  const { signal } = abortController;

  let usernamesEl = (<div class={style.usernames}></div>) as HTMLDivElement;
  let avatarsEl = (<div class={style.avatars}></div>) as HTMLDivElement;
  let el = (
    <div class={[style.typingIndicator, style.hide]}>
      <Icon class={style.icon} name="more_horiz" outlined />
      {avatarsEl}
      {usernamesEl}
    </div>
  ) as HTMLDivElement;

  const rerender = (userIds: string[]) => {
    if (!userIds.length) {
      usernamesEl.replaceChildren();
      avatarsEl.replaceChildren();
      el.classList.add(style.hide!);
      return;
    }
    el.classList.remove(style.hide!);

    const values = userIds
      .map((userId) => {
        const user = userStore.users.get(userId);
        if (!user) return null;
        const member = serverMemberStore.getMember(
          serverStore.currentServerId!,
          userId,
        );
        return { user, member };
      })
      .filter((v) => v !== null);

    const usernames = formatNames(
      values.map((u) => u.member?.nickname || u.user.username),
    )!;

    const avatars = values.map((u) => <Avatar user={u.user} size={14} />);

    usernamesEl.replaceChildren(usernames);
    avatarsEl.replaceChildren(...avatars);
  };

  const handleTypingUpdate = (payload: Record<string, string[]>) => {
    const userIds = payload[channelStore.currentChannelId!] ?? [];
    rerender(userIds);
  };

  typingEmitter.on("typing:update", handleTypingUpdate, signal);

  storeEmitter.on(
    "navigate:channelId",
    () => {
      handleTypingUpdate(handleTypingIndicator.buildTypingSnapshot());
    },
    signal,
  );

  signal.addEventListener(
    "abort",
    () => {
      usernamesEl.remove();
      avatarsEl.remove();
      el.remove();

      (usernamesEl as any) = null;
      (avatarsEl as any) = null;
      (el as any) = null;
    },
    { once: true },
  );

  return {
    el,
  };
};

function formatNames(names: string[]) {
  if (names.length === 0) return null;
  if (names.length === 1) return <b>{names[0]}</b>;
  if (names.length >= 5) return <b>{t`${names.length} users are typing...`}</b>;

  const init = names.slice(0, -1);
  const last = names[names.length - 1];

  return (
    <>
      {init.map((name, i) => (
        <>
          <b>{name}</b>
          {i < init.length - 1 ? ", " : " "}
        </>
      ))}
      {"& "}
      <b>{last}</b>
    </>
  );
}
