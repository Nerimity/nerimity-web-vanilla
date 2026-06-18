import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import type { Message } from "../../store/messageStore";
import { userStore, type User } from "../../store/userStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Avatar } from "../avatar";
import { Icon } from "../icon";

import style from "./typingIndicator.module.css";
interface TypingUser {
  user: User;
  timestamp: number;
}

export const createTypingIndicator = (abortController: AbortController) => {
  const { signal } = abortController;
  let usernamesEl = (<div class={style.usernames}></div>) as HTMLDivElement;
  let avatarsEl = (<div class={style.avatars}></div>) as HTMLDivElement;
  let timeout: NodeJS.Timeout | null = null;
  let el = (
    <div class={[style.typingIndicator, style.hide]}>
      <Icon class={style.icon} name="pending" outlined />
      {avatarsEl}
      {usernamesEl}
    </div>
  ) as HTMLDivElement;
  const typingUsers = new Map<string, TypingUser>();

  const upsertTypingUser = (userId: string) => {
    const existing = typingUsers.get(userId);
    if (existing) {
      existing.timestamp = Date.now();
      return;
    }
    const user = userStore.users.get(userId);
    if (!user) return;
    const typingUser = { user, timestamp: Date.now() };
    typingUsers.set(userId, typingUser);
    rerender();
  };

  const clearOldTypingUsers = () => {
    if (timeout) return;
    const now = Date.now();
    for (const [userId, typingUser] of typingUsers) {
      if (now - typingUser.timestamp > 5000) {
        typingUsers.delete(userId);
      }
    }

    rerender();

    if (typingUsers.size === 0) return;
    timeout = setTimeout(() => {
      timeout = null;
      clearOldTypingUsers();
    }, 5000);
  };

  const rerender = () => {
    if (!typingUsers.size) {
      usernamesEl.replaceChildren();
      avatarsEl.replaceChildren();
      el.classList.add(style.hide!);
      return;
    }
    el.classList.remove(style.hide!);

    const values = [...typingUsers.values()];
    const usernames = formatNames(values.map((u) => u.user.username))!;

    const avatars = values.map((u) => <Avatar user={u.user} size={14} />);

    usernamesEl.replaceChildren(usernames);
    avatarsEl.replaceChildren(...avatars);
  };

  const handleTyping = (payload: { channelId: string; userId: string }) => {
    if (channelStore.currentChannelId !== payload.channelId) return;
    upsertTypingUser(payload.userId);
    clearOldTypingUsers();
  };

  const handleMessageCreated = (payload: Message) => {
    if (channelStore.currentChannelId !== payload.channelId) return;
    const deleted = typingUsers.delete(payload.createdBy.id);
    if (deleted) {
      rerender();
    }
  };

  storeEmitter.on("channel:typing", handleTyping, signal);
  storeEmitter.on("message:created", handleMessageCreated, signal);

  signal.addEventListener("abort", () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;

    usernamesEl.remove();
    avatarsEl.remove();
    el.remove();

    (usernamesEl as any) = null;
    (avatarsEl as any) = null;
    (el as any) = null;
  });

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