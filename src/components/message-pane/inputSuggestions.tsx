import { t } from "@lingui/core/macro";
import { matchSorter } from "match-sorter";

import { Dynamic } from "../../dynamic";
import { h } from "../../h";
import { accountStore } from "../../store/accountStore";
import { Channel, channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { ServerMember, serverMemberStore } from "../../store/serverMemberStore";
import { ServerRole, serverRoleStore } from "../../store/serverRoleStore";
import { serverStore } from "../../store/serverStore";
import { User, userStore } from "../../store/userStore";
import { resolveGradient } from "../../utils/color";
import { debounce } from "../../utils/debounce";
import { customShortcodeToIds, shortcodeToUnicode } from "../../utils/emojis";
import { getLocalItem } from "../../utils/localStorage";
import { RolePermissionFlag } from "../../utils/RolePermissionFlag";
import { Avatar } from "../avatar";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Item } from "../item";
import { Emoji } from "../markup/Emoji";

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

interface ChannelSuggestion {
  type: "channel";
  id: string;
  name: string;
}

interface SpecialSuggestion {
  type: "special";
  id: string;
  name: string;
  subText?: string;
}
interface EmojiSuggestion {
  type: "emoji";
  id: string;
  name: string;
  gif?: boolean;
  custom?: boolean;
}

type SuggestionItem =
  | UserSuggestion
  | RoleSuggestion
  | SpecialSuggestion
  | ChannelSuggestion
  | EmojiSuggestion;
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
    channels?: Channel[];
    special?: ({ id: string; name: string; subText?: string } | null)[];
    emojis?: { id: string; name: string; shortcodes?: string; gif?: boolean }[];
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

    if (opts.channels) {
      return opts.channels.map((channel) => ({
        type: "channel",
        id: channel.id,
        name: channel.name!,
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

    if (opts.emojis) {
      return opts.emojis.map((emoji) => ({
        type: "emoji",
        id: emoji.id,
        name: emoji.shortcodes?.[0] || emoji.name,
        gif: emoji.gif,
        custom: !emoji.shortcodes,
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

      const matchedRoles = matchSorter(roles, searchTerm, {
        keys: ["name"],
      }).slice(0, 10);
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
      ).slice(0, 10);

      const matched = !searchTerm
        ? members.sort((a, b) => b.joinedAt - a.joinedAt)
        : matchSorter(members, searchTerm, {
            keys: ["nickname", (item) => item.user?.username!],
          }).slice(0, 10);
      return [
        ...transformToSuggestion({ members: matched }),
        ...transformToSuggestion({ roles: matchedRoles }),
        ...transformToSuggestion({ special: matchedSpecialMentions }),
      ];
    }
    const users: User[] = [accountStore.currentUser!];
    const recipientId = inboxStore.inboxes.get(channel.id)?.recipientId;
    const recipient = recipientId
      ? userStore.users.get(recipientId)
      : undefined;
    if (recipient) users.push(recipient);

    const matched = matchSorter(users, searchTerm, {
      keys: ["username"],
    }).slice(0, 10);
    return transformToSuggestion({ users: matched });
  };

  const getChannelSuggestions = (searchTerm: string): SuggestionItem[] => {
    const channels = serverStore.currentChannelsSorted.value() || [];

    const matched = matchSorter(channels, searchTerm, { keys: ["name"] }).slice(
      0,
      10,
    );
    return transformToSuggestion({ channels: matched });
  };

  const mapEmoji = () => {
    const emojiMapped: { shortcodes: string[]; id: string }[] = [];
    const emojiEntries = Object.entries(shortcodeToUnicode);

    const byUnicode = new Map<string, { shortcodes: string[]; id: string }>();

    for (let i = 0; i < emojiEntries.length; i++) {
      const [shortcode, unicode] = emojiEntries[i]!;

      let entry = byUnicode.get(unicode);
      if (!entry) {
        entry = { shortcodes: [], id: unicode };
        byUnicode.set(unicode, entry);
        emojiMapped.push(entry);
      }
      entry.shortcodes.push(shortcode);
    }
    return emojiMapped;
  };

  let cachedCombinedEmojis: any[] | null = null;

  const getEmojiSuggestions = (searchTerm: string) => {
    if (!cachedCombinedEmojis) {
      const emojiMapped = mapEmoji();

      const customEmojiEntries = Object.entries(customShortcodeToIds).map(
        ([name, prefixedId]) => ({
          name,
          id: prefixedId.split(":")[1] ?? prefixedId,
          gif: prefixedId.startsWith("ace:"),
        }),
      );
      cachedCombinedEmojis = [...emojiMapped, ...customEmojiEntries];
    }

    const recentEmojis = getLocalItem("recentEmojis", [])!;
    const recentIds = new Set(recentEmojis.map((e) => e.id));

    const matched = matchSorter(cachedCombinedEmojis, searchTerm, {
      keys: ["name", "shortcodes.*"],
      baseSort: (a, b) => {
        const aRecent = recentIds.has(a.item.id) ? 1 : 0;
        const bRecent = recentIds.has(b.item.id) ? 1 : 0;
        return bRecent - aRecent;
      },
    }).slice(0, 10);

    return transformToSuggestion({ emojis: matched });
  };

  const results = (): SuggestionItem[] => {
    const wordAtCursor = getWordAtCursor(inputEl);
    const searchTerm = wordAtCursor.substring(1);

    const isMentionTrigger = wordAtCursor.startsWith("@");
    const isChannelTrigger = wordAtCursor.startsWith("#");
    const isEmojiTrigger =
      wordAtCursor.startsWith(":") && wordAtCursor.length >= 3;
    // const isCommandTrigger = inputEl.value.startsWith("/");

    if (isMentionTrigger) return getMentionSuggestions(searchTerm);
    if (isChannelTrigger) return getChannelSuggestions(searchTerm);
    if (isEmojiTrigger) return getEmojiSuggestions(searchTerm);
    return [];
  };

  let refId = 0;
  const refreshSuggestions = () => {
    cancelAnimationFrame(refId);
    refId = requestAnimationFrame(() => {
      suggestionItems = results().slice(0, 10);
      if (!suggestionItems.length) {
        cachedCombinedEmojis = null;
      }
      selectedIndex = 0;
      rerenderItems();
    });
  };

  inputEl.addEventListener(
    "input",
    refreshSuggestions,

    { signal, passive: true },
  );

  inputEl.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        refreshSuggestions();
        return;
      }

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
  inputEl.addEventListener("click", refreshSuggestions, { signal });
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
  const channelItem = props.item.type === "channel" ? props.item : undefined;
  const emojiItem = props.item.type === "emoji" ? props.item : undefined;

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
        {channelItem && <Icon name="tag" class={style.specialIcon} />}
        {emojiItem && (
          <Emoji
            icon={
              emojiItem.id +
              (emojiItem.custom ? `.${emojiItem.gif ? "gif" : "webp"}` : "")
            }
            animate
          />
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
