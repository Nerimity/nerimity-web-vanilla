import { t } from "@lingui/core/macro";
import { matchSorter } from "match-sorter";

import { Dynamic } from "../../dynamic";
import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { ServerMember, serverMemberStore } from "../../store/serverMemberStore";
import { ServerRole, serverRoleStore } from "../../store/serverRoleStore";
import { serverStore } from "../../store/serverStore";
import { User, userStore } from "../../store/userStore";
import { resolveGradient } from "../../utils/color";
import { debounce } from "../../utils/debounce";
import { RolePermissionFlag } from "../../utils/RolePermissionFlag";
import { Avatar } from "../avatar";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Item } from "../item";

import style from "./inputSuggestions.module.css";

interface UserSuggestion {
  type: "user";
  id: string;
  name: string;
  avatar?: string;
  user: User;
  member?: ServerMember;
}
interface RoleSuggestion {
  type: "role";
  id: string;
  name: string;
  icon?: string;
  color?: string;
  subText?: string;
}

interface SpecialSuggestion {
  type: "special";
  id: string;
  name: string;
  subText?: string;
}

type SuggestionItem = UserSuggestion | RoleSuggestion | SpecialSuggestion;
export const createInputSuggestions = (opts: {
  signal: AbortSignal;
  inputEl: HTMLTextAreaElement;
}) => {
  const { signal, inputEl } = opts;
  let suggestionItems: SuggestionItem[] | null = null;
  let selectedIndex = 0;

  let container = (
    <div class={[style.inputSuggestions, style.hide]}></div>
  ) as HTMLDivElement;

  const rerenderItems = () => {
    container.classList.toggle(style.hide!, !suggestionItems?.length);

    container.replaceChildren(
      ...(suggestionItems?.map((item, i) => (
        <SuggestionItem selected={i === selectedIndex} item={item} />
      )) ?? []),
    );
  };

  const handleMouseMove = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const item = target.closest(`.${style.suggestionItem}`);
    if (!item) return;
    const children = [...container.children];
    selectedIndex = children.indexOf(item);
    children.forEach((child, i) =>
      child.setAttribute("data-selected", String(i === selectedIndex)),
    );
  };

  container.addEventListener("mouseover", handleMouseMove, {
    signal,
    passive: true,
  });
  container.addEventListener("mousemove", debounce(handleMouseMove, 10), {
    signal,
    passive: true,
  });

  const transformToSuggestion = (opts: {
    users?: User[];
    members?: ServerMember[];
    roles?: ServerRole[];
    special?: ({ id: string; name: string; subText?: string } | null)[];
  }): SuggestionItem[] => {
    const { users, members, roles } = opts;

    if (users) {
      return users.map((user) => ({
        type: "user",
        id: user.id,
        name: user.username,
        avatar: user.avatar,
        user,
      }));
    }
    if (roles) {
      return roles.map((role) => ({
        type: "role",
        id: role.id,
        name: role.name,
        icon: role.icon,
        color: role.hexColor,
        subText: t`Role`,
      }));
    }

    if (members) {
      return members.map((member) => ({
        type: "user",
        id: member.userId,
        name: member.nickname || member.user?.username || "",
        avatar: member.user?.avatar || "",
        user: member.user!,
        member,
      }));
    }

    if (opts.special) {
      return opts.special.map((item) => ({
        type: "special",
        id: item?.id || "",
        name: item?.name || "",
        subText: item?.subText,
      }));
    }

    return [];
  };

  const getMentionSuggestions = (searchTerm: string): SuggestionItem[] => {
    const channel = channelStore.currentChannel();
    if (!channel) return [];

    if (channel.serverId) {
      const members = [
        ...(serverMemberStore.serverMembers.get(channel.serverId)?.values() ||
          []),
      ];

      const currentMember = serverMemberStore.currentMember(channel.serverId);
      const canMentionRoles = currentMember?.hasPerm(
        RolePermissionFlag.mentionRoles.bit,
      );
      const canMentionEveryone = currentMember?.hasPerm(
        RolePermissionFlag.mentionEveryone.bit,
      );
      const roles = canMentionRoles
        ? [...(serverRoleStore.roles.get(channel.serverId)?.values() || [])]
        : [];

      const matchedRoles = matchSorter(roles, searchTerm, { keys: ["name"] });
      const matchedSpecialMentions = matchSorter(
        [
          { id: "si", name: "silent", subText: t`Silent message.` },
          { id: "s1", name: "someone", subText: t`Mentions a random user.` },
          ...(canMentionEveryone
            ? [{ id: "e1", name: "@ everyone", subText: t`Mentions everyone.` }]
            : []),
        ],
        searchTerm,
        { keys: ["name"] },
      );

      const matched = !searchTerm
        ? members.sort((a, b) => b.joinedAt - a.joinedAt)
        : matchSorter(members, searchTerm, {
            keys: ["nickname", (item) => item.user?.username!],
          });
      return [
        ...transformToSuggestion({ members: matched }),
        ...transformToSuggestion({ roles: matchedRoles }),
        ...transformToSuggestion({ special: matchedSpecialMentions }),
      ].slice(0, 10);
    }
    const users: User[] = [accountStore.currentUser!];
    const recipientId = inboxStore.inboxes.get(channel.id)?.recipientId;
    const recipient = recipientId
      ? userStore.users.get(recipientId)
      : undefined;
    if (recipient) users.push(recipient);

    const matched = matchSorter(users, searchTerm, { keys: ["username"] });
    return transformToSuggestion({ users: matched });
  };

  const results = (): SuggestionItem[] => {
    const wordAtCursor = getWordAtCursor(inputEl);
    const searchTerm = wordAtCursor.substring(1);

    const isMentionTrigger = wordAtCursor.startsWith("@");
    // const isEmojiTrigger = wordAtCursor.startsWith(":") && wordAtCursor.length >= 3;
    // const isCommandTrigger = inputEl.value.startsWith("/");

    if (isMentionTrigger) return getMentionSuggestions(searchTerm);

    return [];
  };

  const refreshSuggestions = () => {
    suggestionItems = results();
    selectedIndex = 0;
    rerenderItems();
  };

  inputEl.addEventListener(
    "input",
    refreshSuggestions,

    { signal, passive: true },
  );

  inputEl.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

      const children = [...container.children];
      if (children.length === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const delta = event.key === "ArrowUp" ? -1 : 1;
      selectedIndex =
        (selectedIndex + delta + children.length) % children.length;

      children.forEach((child, i) =>
        child.setAttribute("data-selected", String(i === selectedIndex)),
      );
    },
    { signal },
  );
  inputEl.addEventListener("focus", refreshSuggestions, { signal });
  inputEl.addEventListener(
    "blur",
    () => {
      container.classList.add(style.hide!);
    },
    { signal },
  );

  signal.addEventListener(
    "abort",
    () => {
      container.remove();
      (container as any) = null;
    },
    { once: true },
  );

  return container;
};

const SuggestionItem = (props: {
  selected?: boolean;
  item: SuggestionItem;
}) => {
  const userItem = props.item.type === "user" ? props.item : undefined;
  const roleItem = props.item.type === "role" ? props.item : undefined;
  const special = props.item.type === "special" ? props.item : undefined;

  let subText = "subText" in props.item ? props.item.subText : undefined;
  if (userItem && userItem.name !== userItem?.user.username) {
    subText = userItem.user.username;
  }

  const color = userItem?.member
    ? resolveGradient(serverStore.memberTopColor(userItem.member))
    : roleItem?.color
      ? resolveGradient(roleItem.color)
      : undefined;
  return (
    <Item.Base class={style.suggestionItem} data-selected={props.selected}>
      <div class={style.icon}>
        {userItem && <Avatar user={userItem.user} size={18} />}
        {(special || roleItem) && (
          <Icon name="alternate_email" class={style.specialIcon} />
        )}
      </div>
      <Dynamic
        component={color ? GradientText : "div"}
        color={color}
        class={style.name}
      >
        {props.item.name}
      </Dynamic>

      <div class={style.left}>
        {subText}
        {!subText && <Icon name="keyboard_return" class={style.returnIcon} />}
      </div>
    </Item.Base>
  );
};

const getWordAtCursor = (element: HTMLTextAreaElement) => {
  const cursorPosition = element.selectionStart;
  const textBeforeCursor = element.value.substring(0, cursorPosition);
  const lastWord = textBeforeCursor.split(/\s+/).reverse()[0];
  return lastWord || "";
};
