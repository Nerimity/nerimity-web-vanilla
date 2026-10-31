import { matchSorter } from "match-sorter";

import { Dynamic } from "../../dynamic";
import type { KlipyItem } from "../../services/klipyService";
import { searchUser, type SearchUserResult } from "../../services/userService";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { inboxStore } from "../../store/inboxStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { User, userStore } from "../../store/userStore";
import { createTokenSource } from "../../utils/createTokenSource";
import { debounce } from "../../utils/debounce";
import { closestFromEvent } from "../../utils/dom";
import type { CustomEmoji, EmojiData } from "../../utils/emojis";
import { createResizeObserver } from "../../utils/observer";
import { createTimeModal } from "../modals/TimeModal";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { createColorPickerModalLazy } from "./createColorPickerLazy";
import { ExpressionPickerLazy } from "./expression-picker/ExpressionPickerLazy";
import { Skeleton } from "./skeleton";

import style from "./input.module.css";

interface InputProps {
  class?: string | string[];
  prefix?: any;
  suffix?: any;
  label?: any;
  type?: "text" | "number" | "password" | "textarea";
  autocomplete?:
    | "current-password"
    | "one-time-code"
    | "new-password"
    | "email"
    | "off";
  placeholder?: string;
  id?: string;
  value?: string;
  maxLength?: number;
  showFormatBar?: boolean;
  showFormatBarHtml?: boolean;
  showFormatBarEmoji?: boolean;
  showFormatBarGif?: boolean;
  footer?: any;
  [key: string]: any;
}
export const Input = (props: InputProps) => {
  const {
    prefix,
    suffix,
    label,
    type,
    autocomplete,
    placeholder,
    id,
    value,
    maxLength,
    showFormatBar,
    showFormatBarHtml,
    showFormatBarEmoji,
    showFormatBarGif,
    footer,
    ...rest
  } = props;
  return (
    <div {...rest} class={[style.inputContainer, rest.class]}>
      {label && <div class="label">{label}</div>}
      {showFormatBar && (
        <FormatBar
          showFormatBarEmoji={showFormatBarEmoji}
          showFormatBarHtml={showFormatBarHtml}
          showFormatBarGif={showFormatBarGif}
        />
      )}

      <div class={[style.inputInnerContainer, "inputContainer"]}>
        <div class={style.inputInnerInnerContainer}>
          {prefix}
          <Dynamic
            id={id}
            placeholder={placeholder}
            maxlength={maxLength}
            class={["input", style.input]}
            component={type === "textarea" ? "textarea" : "input"}
            type={type || "text"}
            value={type != "textarea" ? value : undefined}
            autocomplete={autocomplete}
          >
            {type === "textarea" ? value || "" : ""}
          </Dynamic>
          {suffix}
        </div>
        {footer}
      </div>
    </div>
  );
};

export const createTextareaHeightHandler = (opts: {
  textarea: HTMLTextAreaElement;
  signal: AbortSignal;
}) => {
  const adjust = () => {
    opts.textarea.style.height = "34px";
    opts.textarea.style.height = opts.textarea.scrollHeight + "px";
  };

  requestAnimationFrame(adjust);

  createResizeObserver(opts.textarea, adjust, { signal: opts.signal });
  opts.textarea.addEventListener("input", adjust, { signal: opts.signal });
  return { adjust };
};

export const TimestampType = {
  RELATIVE: "tr",
  OFFSET: "to",
} as const;

const Formats = {
  named_link: (url: string) => ({
    offsetStart: 1,
    offsetEnd: "Name".length + 1,
    res: `[Name](${url || "https://example.com"})`,
  }),
  checkbox: (_text: string) => ({
    offsetStart: 5,
    offsetEnd: 5 + " Item 1".length,
    res: "-[ ] Item 1\n",
  }),
  header: (text: string) => ({
    offsetStart: 2,
    offsetEnd: text.length + 2,
    res: `# ${text}`,
  }),
  bold: (text: string) => ({
    offsetStart: 2,
    offsetEnd: text.length + 2,
    res: `**${text}**`,
  }),
  italic: (text: string) => ({
    offsetStart: 1,
    offsetEnd: text.length + 1,
    res: `_${text}_`,
  }),
  strikethrough: (text: string) => ({
    offsetStart: 2,
    offsetEnd: text.length + 2,
    res: `~~${text}~~`,
  }),
  spoiler: (text: string) => ({
    offsetStart: 2,
    offsetEnd: text.length + 2,
    res: `||${text}||`,
  }),
  color: (text: string, color?: string) => ({
    offsetStart: color!.length + 2,
    offsetEnd: color!.length + 2 + text.length,
    res: `[${color}]${text || ""}`,
  }),
  gradient: (text: string, colors: string) => ({
    offsetStart: colors.length + 12,
    offsetEnd: colors.length + 12 + "Message".length,
    res: `[gradient: ${colors} ${text || "Message"}]`,
  }),

  timestamp: (
    _text: string,
    schedule?: number,
    type?: (typeof TimestampType)[keyof typeof TimestampType],
  ) => ({
    offsetStart: 5 + schedule!.toString().length,
    offsetEnd: 5 + schedule!.toString().length,
    res: `[${type === TimestampType.RELATIVE ? "tr" : "to"}:${schedule}]`,
  }),
} as const;

const FormatBar = (opts: {
  showFormatBarHtml?: boolean;
  showFormatBarEmoji?: boolean;
  showFormatBarGif?: boolean;
}) => {
  return (
    <div class={style.formatBar}>
      <Button data-action="bold" icon="format_bold" hoverBorder />
      <Button data-action="italic" icon="format_italic" hoverBorder />
      <Button data-action="strikethrough" icon="strikethrough_s" hoverBorder />
      <Button data-action="header" icon="title" hoverBorder />
      <Button data-action="named_link" icon="link" hoverBorder />
      <Button data-action="checkbox" icon="select_check_box" hoverBorder />
      <Button data-action="spoiler" icon="visibility_off" hoverBorder />
      <Button data-action="timestamp" icon="schedule" hoverBorder />
      <Button data-action="color" icon="palette" hoverBorder />
      {opts.showFormatBarHtml && (
        <Button data-action="html" icon="code_xml" hoverBorder />
      )}
      {opts.showFormatBarEmoji && (
        <Button
          data-show-gif={opts.showFormatBarGif}
          data-action="emoji"
          icon="face"
          hoverBorder
        />
      )}
    </div>
  );
};

const applyFormat = ({
  inputEl,
  format,
  color,
  schedule,
  type,
  onTextUpdate,
}: {
  inputEl: HTMLInputElement;
  format: keyof typeof Formats;
  color?: string;
  schedule?: number | string;
  type?: (typeof TimestampType)[keyof typeof TimestampType];
  onTextUpdate: (text: string) => void;
}) => {
  const transformFunc = Formats[format];
  if (!transformFunc) return;

  const start = inputEl.selectionStart!;
  const finish = inputEl.selectionEnd!;
  const allText = inputEl.value;
  const sel = allText.substring(start, finish);

  const modifySel = transformFunc(sel, (schedule || color) as never, type);
  const newText =
    allText.substring(0, start) +
    modifySel.res +
    allText.substring(finish, allText.length);

  inputEl.focus();

  onTextUpdate(newText);
  inputEl.selectionStart = start + modifySel.offsetStart;
  inputEl.selectionEnd = start + modifySel.offsetEnd;
};

interface HandleFormatBarOpts {
  signal: AbortSignal;
  inputContainer: HTMLDivElement;
  onTextUpdate: (text: string) => void;
}

export const handleFormatBar = (opts: HandleFormatBarOpts) => {
  const inputEl = opts.inputContainer.querySelector(
    "input, textarea",
  ) as HTMLInputElement;

  const onEmojiPick = (emoji?: EmojiData, custom?: CustomEmoji) => {
    const shortcode = emoji?.short_names[0] || custom?.name;
    if (!shortcode) return;
    inputEl.focus();
    const selStart = inputEl.selectionStart!;
    const selEnd = inputEl.selectionEnd!;
    inputEl.setRangeText(`:${shortcode}: `, selStart, selEnd, "end");
    opts.onTextUpdate(inputEl.value);
  };

  const onGifPick = (gif: KlipyItem) => {
    inputEl.focus();
    const selStart = inputEl.selectionStart!;
    const selEnd = inputEl.selectionEnd!;
    inputEl.setRangeText(`${gif.url} `, selStart, selEnd, "end");
    opts.onTextUpdate(inputEl.value);
  };

  opts.inputContainer.addEventListener(
    "click",
    (event) => {
      const actionEl = closestFromEvent(event, "[data-action]");
      if (!actionEl) return;

      const action = actionEl.dataset.action as keyof typeof Formats | "emoji";

      if (action === "emoji") {
        const showFormatBarGif = actionEl.dataset.showGif === "true";
        ExpressionPickerLazy({
          targetEl: actionEl,
          tabs: showFormatBarGif ? ["GIFs", "emojis"] : ["emojis"],
          onEmojiPick,
          onGifPick,
        });
        return;
      }

      if (action === "color") {
        createColorPickerModalLazy({
          color: "#ff0000",
          anchor: "top-center",
          gradientTab: true,
          onClose(color, colors) {
            applyFormat({
              inputEl,
              format: colors ? "gradient" : "color",
              onTextUpdate: opts.onTextUpdate,
              color: colors ? colors.join("-") : color,
            });
          },
          triggerEl: actionEl,
        });
        return;
      }
      if (action === "timestamp") {
        createTimeModal({
          onConfirm(event) {
            applyFormat({
              inputEl,
              format: action,
              onTextUpdate: opts.onTextUpdate,
              type: event.type,
              schedule: event.val,
            });
          },
        });
        return;
      }

      applyFormat({
        inputEl,
        format: action,
        onTextUpdate: opts.onTextUpdate,
      });
    },
    { signal: opts.signal },
  );
};

export const handleInputUserSuggestions = (opts: {
  signal: AbortSignal;
  inputContainer: HTMLElement;
  mode: "insert" | "remove";
  onSelect: (user: SearchUserResult | User) => void;
}) => {
  const MaxSuggestions = 10;
  const input = opts.inputContainer.querySelector(
    "input, textarea",
  ) as HTMLInputElement;

  const getMentionQuery = () => {
    const wordAtCursor = getWordAtCursor(input);
    const searchTerm = wordAtCursor.substring(1);

    const isMentionTrigger = wordAtCursor.startsWith("@");
    return isMentionTrigger ? searchTerm : null;
  };

  const channel = () => channelStore.currentChannel();

  const getSearchedDMUsers = () => {
    const query = getMentionQuery();
    if (query === null) return [];
    const users: User[] = [accountStore.currentUser!];
    const recipientId = inboxStore.inboxes.get(channel()?.id!)?.recipientId;
    const recipient = recipientId
      ? userStore.users.get(recipientId)
      : undefined;
    if (recipient && recipient.id !== users[0]?.id) users.push(recipient);

    const matched = matchSorter(users, query, {
      keys: ["username"],
    }).slice(0, MaxSuggestions);
    return matched.map((u) => {
      return {
        type: "dm",
        user: u,
      } as const;
    });
  };

  const getSearchedMembers = () => {
    const query = getMentionQuery();
    if (query === null) return [];

    const members = [
      ...(serverMemberStore.serverMembers.get(channel()?.serverId!)?.values() ||
        []),
    ];

    const matched = !query
      ? members.sort((a, b) => b.joinedAt - a.joinedAt).slice(0, 10)
      : matchSorter(members, query, {
          keys: ["nickname", (item) => item.user?.username!],
        }).slice(0, MaxSuggestions);

    return matched.map((m) => {
      return {
        type: "member",
        user: m.user!,
        nickname: m.nickname,
      } as const;
    });
  };

  const fetchSuggestions = async () => {
    const query = getMentionQuery();
    if (query === null) return [];
    const [res] = await searchUser(query);
    const users = res || [];

    const matched = matchSorter(users, query, {
      keys: ["nickname", (item) => item.username!],
    }).slice(0, MaxSuggestions);

    return matched.map((u) => {
      return {
        type: "user",
        user: u,
      } as const;
    });
  };

  const fetchSource = createTokenSource();

  let res: Suggestion[] = [];
  const getSuggestions = async () => {
    res = [];
    res.push(...getSearchedMembers());
    if (!res.length) {
      res.push(...getSearchedDMUsers());
    }

    const remaining = MaxSuggestions - res.length;
    if (remaining > 0) {
      const suggestions = await fetchSuggestions();
      const filtered = suggestions.filter(
        (r) => !res.some((s) => s.user.id === r.user.id),
      );

      res.push(...filtered.slice(0, remaining));
    }
    return res;
  };

  type Suggestion =
    | {
        readonly type: "user";
        readonly user: SearchUserResult;
      }
    | {
        readonly type: "member";
        readonly user: User;
        readonly nickname: string | undefined;
      }
    | {
        readonly type: "dm";
        readonly user: User;
      };

  const getContainer = () =>
    opts.inputContainer.querySelector<HTMLDivElement>(`.${style.suggestions}`);

  const removeSuggestions = () => getContainer()?.remove();

  const renderSuggestions = (suggestions?: Suggestion[]) => {
    const isSkeleton = suggestions === undefined;
    const existing = getContainer();

    if (isSkeleton && existing?.dataset.skeleton === "true") return;

    if (!isSkeleton && !suggestions.length) {
      existing?.remove();
      return;
    }

    const container =
      existing ?? ((<div class={style.suggestions}></div>) as HTMLDivElement);
    container.dataset.skeleton = String(isSkeleton);

    container.replaceChildren(
      isSkeleton ? (
        <div class={style.skeletons}>
          {Array.from({ length: MaxSuggestions }).map(() => (
            <div class={style.suggestionItemSkeleton}>
              <Skeleton style={{ width: "100%", height: "32px" }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {suggestions.map((suggestion) => (
            <div class={style.suggestionItem} data-sug-id={suggestion.user.id}>
              <Avatar size={24} user={suggestion.user} />
              {suggestion.type === "member"
                ? suggestion.nickname || suggestion.user.username
                : suggestion.user.username}
            </div>
          ))}
        </>
      ),
    );

    if (!existing) input.parentElement?.appendChild(container);
  };
  const updateSuggestionsDebounced = debounce(async () => {
    const isStale = fetchSource.capture();

    const suggestions = await getSuggestions();
    if (isStale()) return;
    renderSuggestions(suggestions);
  }, 800);

  const updateSuggestions = () => {
    if (getMentionQuery() === null) {
      removeSuggestions();
    } else {
      renderSuggestions();
    }
    updateSuggestionsDebounced();
  };
  input.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === "Tab") {
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        updateSuggestions();
      }
    },
    { signal: opts.signal },
  );

  input.addEventListener(
    "blur",
    () => {
      setTimeout(() => {
        fetchSource.invalidate();
        opts.inputContainer.querySelector(`.${style.suggestions}`)?.remove();
      }, 100);
    },
    { signal: opts.signal },
  );
  input.addEventListener(
    "focus",
    () => {
      updateSuggestionsDebounced();
    },
    { signal: opts.signal },
  );
  input.addEventListener(
    "input",
    () => {
      updateSuggestions();
    },
    { signal: opts.signal },
  );

  opts.inputContainer.addEventListener(
    "mousedown",
    (event) => {
      if (closestFromEvent(event, `.${style.suggestionItem}`)) {
        event.preventDefault();
      }
    },
    { signal: opts.signal },
  );

  opts.inputContainer.addEventListener(
    "click",
    (event) => {
      const suggestionItem = closestFromEvent(
        event,
        `.${style.suggestionItem}`,
      ) as HTMLDivElement;
      if (!suggestionItem) return;
      const userId = suggestionItem.dataset.sugId;
      if (!userId) return;
      const user = res.find((s) => s.user.id === userId)?.user;
      if (!user) return;
      opts.onSelect(user);
      if (opts.mode === "remove") {
        const wordAtCursor = getWordAtCursor(input);
        const cursorPosition = input.selectionStart!;
        const targetIndex = cursorPosition - wordAtCursor.length;

        input.value = stringSplice(
          input.value,
          targetIndex,
          wordAtCursor.length,
        );

        input.focus();
        input.selectionStart = targetIndex;
        input.selectionEnd = targetIndex;

        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (opts.mode === "insert") {
        const wordAtCursor = getWordAtCursor(input);
        const cursorPosition = input.selectionStart!;
        const targetIndex = cursorPosition - wordAtCursor.length;
        const replacementText = `@${user.username}:${user.tag} `;

        input.value =
          input.value.slice(0, targetIndex) +
          replacementText +
          input.value.slice(cursorPosition);

        const newCursor = targetIndex + replacementText.length;
        input.focus();
        input.setSelectionRange(newCursor, newCursor);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    { signal: opts.signal },
  );
};

const getWordAtCursor = (element: HTMLInputElement) => {
  const cursorPosition = element.selectionStart || 0;
  const textBeforeCursor = element.value.substring(0, cursorPosition);
  const lastWord = textBeforeCursor.split(/\s+/).reverse()[0];
  return lastWord || "";
};

function stringSplice(text: string, startIndex: number, deleteCount: number) {
  return (
    text.substring(0, startIndex) + text.substring(startIndex + deleteCount)
  );
}
