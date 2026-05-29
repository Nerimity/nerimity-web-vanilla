import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h, Fragment } from "../../h";
import { channelStore } from "../../store/channelStore";
import type { Message } from "../../store/messageStore";
import { userStore, type User } from "../../store/userStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Avatar } from "../avatar";
import { Icon } from "../icon";

interface TypingUser {
  user: User;
  timestamp: number;
}

const typingIndicator = css`
  display: flex;
  gap: 4px;
  border-radius: var(--radius-max);
  background: var(--gray-900);
  border: solid 1px var(--gray-600);
  padding: 4px;
  padding-right: 8px;
  color: var(--text-color);
  align-self: start;
  align-items: center;
  font-size: 12px;
  height: 26px;
  .icon {
    color: var(--gray-400);
    font-size: 16px;
  }

  .usernames {
    color: var(--gray-400);
    b {
      color: var(--text-color);
    }
  }

  &.hide {
    visibility: hidden;
  }
  .avatars {
    display: flex;

    .avatar {
      margin-left: -6px;
      outline: 2px solid var(--gray-900);
      border-radius: 50%;

      &:first-child {
        margin-left: 0;
      }
    }
  }
`;

export const createTypingIndicator = (abortController: AbortController) => {
  const { signal } = abortController;
  const usernamesEl = (<div class="usernames"></div>) as HTMLDivElement;
  const avatarsEl = (<div class="avatars"></div>) as HTMLDivElement;
  let timeout: NodeJS.Timeout | null = null;
  const el = (
    <div class={[typingIndicator, "hide"]}>
      <Icon class="icon" name="pending" outlined />
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
      el.classList.add("hide");
      return;
    }
    el.classList.remove("hide");

    const values = [...typingUsers.values()];
    const usernames = formatNames(values.map((u) => u.user.username))!;

    const avatars = values.map((u) => <Avatar user={u.user} size={16} />);

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
