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
import type { RawBotCommand } from "../../Types";
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
interface CommandSuggestion {
  type: "cmd";
  id: string;
  name: string;
  botId?: string;
  description?: string;
  args?: string;
}

type SuggestionItem =
  | UserSuggestion
  | RoleSuggestion
  | SpecialSuggestion
  | ChannelSuggestion
  | EmojiSuggestion
  | CommandSuggestion;
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
    commands?: RawBotCommand[];
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

    const currentMember = serverMemberStore.currentMember(
      channelStore.currentChannel()?.serverId || "",
    );

    if (opts.commands) {
      return opts.commands
        .filter((command) => currentMember?.hasPerm(command.permissions || 0))
        .map((command) => ({
          type: "cmd",
          id: command.name,
          name: `/${command.name}`,
          botId: command.botUserId,
          description: command.description || undefined,
          args: command.args || undefined,
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
            ? [{ id: "e1", name: "everyone", subText: t`Mentions everyone.` }]
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

    const matchedSpecialMentions = matchSorter(
      [
        { id: "si", name: "silent", subText: t`Silent message.` },
        { id: "s1", name: "someone", subText: t`Mentions a random user.` },
      ],
      searchTerm,
      { keys: ["name"] },
    ).slice(0, 10);

    return [
      ...transformToSuggestion({ users: matched }),
      ...transformToSuggestion({ special: matchedSpecialMentions }),
    ];
  };

  const getChannelSuggestions = (searchTerm: string): SuggestionItem[] => {
    const channels = serverStore.currentChannelsSorted.value() || [];

    const matched = matchSorter(channels, searchTerm, { keys: ["name"] }).slice(
      0,
      10,
    );
    return transformToSuggestion({ channels: matched });
  };
  const getCommandSuggestions = async (
    searchTerm: string,
  ): Promise<SuggestionItem[]> => {
    const server = serverStore.currentServer();
    if (!server) return [];
    const { commands, cache } = await server.getOrLoadBotCommands();
    //fixes race condition
    if (!cache) {
      refreshSuggestions();
    }
    if (!commands) return [];

    const matched = matchSorter(commands, searchTerm, { keys: ["name"] }).slice(
      0,
      10,
    );
    return transformToSuggestion({ commands: matched });
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

  const results = async (): Promise<SuggestionItem[]> => {
    const wordAtCursor = getWordAtCursor(inputEl);
    const searchTerm = wordAtCursor.substring(1);

    const isMentionTrigger = wordAtCursor.startsWith("@");
    const isChannelTrigger = wordAtCursor.startsWith("#");
    const isEmojiTrigger =
      wordAtCursor.startsWith(":") && wordAtCursor.length >= 3;
    const isCommandTrigger =
      inputEl.value.startsWith("/") && !inputEl.value.includes(" ");

    if (isMentionTrigger) return getMentionSuggestions(searchTerm);
    if (isChannelTrigger) return getChannelSuggestions(searchTerm);
    if (isEmojiTrigger) return getEmojiSuggestions(searchTerm);

    if (isCommandTrigger) return await getCommandSuggestions(searchTerm);

    return [];
  };

  let refId = 0;
  const refreshSuggestions = () => {
    cancelAnimationFrame(refId);
    refId = requestAnimationFrame(async () => {
      suggestionItems = (await results()).slice(0, 10);
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
      if (event.key === "Enter" || event.key === "Tab") {
        const action = container.children[selectedIndex] as HTMLElement | null;
        if (action) {
          event.preventDefault();
          event.stopImmediatePropagation();
          insert(action);
        }
      }

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

  const insert = (itemEl: HTMLElement) => {
    const insert = itemEl.dataset.insert;
    if (!insert) return;
    const wordAtCursor = getWordAtCursor(inputEl);

    insertAutocompleteText({
      channelId: channelStore.currentChannelId!,
      textArea: inputEl,
      triggerText: wordAtCursor,
      replacementText: insert + " ",
    });
    refreshSuggestions();
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;

      const item = target.closest(
        `.${style.suggestionItem}`,
      ) as HTMLElement | null;

      if (item) {
        insert(item);
      }

      suggestionItems = null;
      rerenderItems();
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

type SuggestionItemProps = {
  selected?: boolean;
  item: SuggestionItem;
};

function getItemConfig(item: SuggestionItem) {
  switch (item.type) {
    case "user": {
      const color = item.member
        ? resolveGradient(serverStore.memberTopColor(item.member))
        : undefined;
      return {
        icon: <Avatar user={item.user} size={18} />,
        insert: `@${item.user.username}:${item.user.tag}`,
        color,
        subText:
          item.name !== item.user.username ? item.user.username : undefined,
      };
    }
    case "role":
      return {
        icon: <Icon name="alternate_email" class={style.specialIcon} />,
        insert: `@${item.name}@`,
        color: item.color ? resolveGradient(item.color) : undefined,
        subText: t`Role`,
      };
    case "channel":
      return {
        icon: <Icon name="tag" class={style.specialIcon} />,
        insert: `#${item.name}#`,
        color: undefined,
      };
    case "emoji":
      return {
        icon: (
          <Emoji
            icon={
              item.id + (item.custom ? `.${item.gif ? "gif" : "webp"}` : "")
            }
            animate
          />
        ),
        insert: `:${item.name}:`,
      };
    case "cmd": {
      const botUser = userStore.users.get(item.botId!);
      return {
        icon: botUser ? <Avatar user={botUser} size={32} /> : undefined,
        insert: `${item.name}`,
        description: item.description,
        args: item.args,
      };
    }
    case "special":
      return {
        icon: <Icon name="alternate_email" class={style.specialIcon} />,
        insert: `@${item.name}`,
        subText: item.subText,
      };
    default:
      return item satisfies never;
  }
}

const SuggestionItem = (props: SuggestionItemProps) => {
  const config = getItemConfig(props.item);

  return (
    <Item.Base
      class={style.suggestionItem}
      data-selected={props.selected}
      data-insert={config.insert}
    >
      <div class={style.icon}>{config.icon}</div>

      <div>
        <Dynamic
          component={config.color ? GradientText : "div"}
          color={config.color}
          class={style.name}
        >
          {props.item.name}{" "}
          {config.args && <span class={style.args}>{config.args}</span>}
        </Dynamic>
        {config.description && (
          <div class={style.description}>{config.description}</div>
        )}
      </div>

      <div class={style.right}>
        {config.subText}
        {!config.subText && (
          <Icon name="keyboard_return" class={style.returnIcon} />
        )}
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

interface AutocompleteConfig {
  channelId: string;
  textArea: HTMLTextAreaElement;
  triggerText: string;
  replacementText: string;
}

function insertAutocompleteText(config: AutocompleteConfig) {
  const { channelId, textArea, triggerText, replacementText } = config;

  const property = channelStore.getProperty(channelId)!;
  const cursorPosition = textArea.selectionStart!;

  const targetIndex = cursorPosition - triggerText.length;

  const textWithTriggerRemoved = stringSplice(
    property.content,
    targetIndex,
    triggerText.length,
  );

  const result =
    textWithTriggerRemoved.slice(0, targetIndex) +
    replacementText +
    textWithTriggerRemoved.slice(targetIndex);

  property.content = result;
  textArea.value = result;

  textArea.focus();

  const newCursorPosition =
    cursorPosition + (replacementText.length - triggerText.length);
  textArea.selectionStart = newCursorPosition;
  textArea.selectionEnd = newCursorPosition;
}

function stringSplice(text: string, startIndex: number, deleteCount: number) {
  return (
    text.substring(0, startIndex) + text.substring(startIndex + deleteCount)
  );
}
