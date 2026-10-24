import { t } from "@lingui/core/macro";

import { searchChannelMessages } from "../../services/channelService";
import { searchServerMessages } from "../../services/serverService";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { Message } from "../../store/messageStore";
import { serverStore } from "../../store/serverStore";
import type { RawMessage } from "../../Types";
import { debounce } from "../../utils/debounce";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { CdnIcon } from "../cdnIcon";
import { Icon } from "../icon";
import { MessageItem } from "../message-pane/messageItem";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MessageSkeleton } from "../ui/skeleton";

import style from "./SearchDrawer.module.css";

export const createSearchDrawer = () => {
  const ac = new AbortController();
  const { signal } = ac;

  let messageListEl = (
    <div class={style.messageContainer}></div>
  ) as HTMLDivElement;

  let searchInCurrentChannel = true;

  const Filters = () => {
    const currentChannel = channelStore.currentChannel();
    const name = currentChannel?.name || "";
    return (
      <div class={style.filtersContainer}>
        <Button
          data-action="search-in-current-channel"
          label={t`Search In #${name}`}
          primary={searchInCurrentChannel}
        />
      </div>
    );
  };

  let query = "";
  let isShowingSkeleton = false;

  let el = (
    <div class={style.container}>
      <Input
        prefix={<Icon class={style.searchIcon} name="search" />}
        class={style.searchInput}
        placeholder={t`Search messages...`}
      />
      <Filters />
      {messageListEl}
    </div>
  ) as HTMLDivElement;

  el.addEventListener(
    "input",
    (event) => {
      const input = event.target as HTMLInputElement;
      query = input.value;

      loadMessages();
    },
    { signal },
  );

  const rerenderFilters = () => {
    const filtersEl = el.querySelector(`.${style.filtersContainer}`);
    if (filtersEl) {
      filtersEl.replaceWith(<Filters />);
    }
  };

  el.addEventListener(
    "click",
    (event) => {
      if (
        closestFromEvent(event, `[data-action="search-in-current-channel"]`)
      ) {
        searchInCurrentChannel = !searchInCurrentChannel;
        rerenderFilters();
        loadMessages();
      }
    },
    { signal },
  );

  const render = () => {
    return el;
  };

  const debouncedLoadMessages = debounce(async () => {
    if (signal.aborted) return;

    const serverId = serverStore.currentServerId;
    if (!serverId) return;

    let messages: RawMessage[] | null = null;

    if (searchInCurrentChannel) {
      const channelId = channelStore.currentChannel()?.id!;
      [messages] = await searchChannelMessages(channelId, { query });
    } else {
      [messages] = await searchServerMessages(serverId, { query });
    }
    messages = messages || [];

    if (signal.aborted) return;

    messages?.reverse();
    isShowingSkeleton = false;

    messageListEl.replaceChildren(
      <>
        {messages.map((message, i) => {
          const prev = messages[i - 1];
          const channel = channelStore.channels.get(message.channelId);
          return (
            <div class={style.messageContainer}>
              {channel && prev?.channelId !== message.channelId && (
                <div class={style.channelHeader}>
                  <CdnIcon size={16} channel={channel} />
                  {channel?.name}
                </div>
              )}
              <MessageItem
                container={messageListEl}
                grouped={false}
                hideNewDayMarker
                message={new Message(message)}
              />
            </div>
          );
        })}
      </>,
    );
  }, 800);

  const loadMessages = () => {
    rerenderFilters();
    if (!accountStore.authenticated) return;
    if (!isShowingSkeleton) {
      isShowingSkeleton = true;
      messageListEl.replaceChildren(
        <>
          {Array.from({ length: 26 }, () => (
            <MessageSkeleton />
          ))}
        </>,
      );
    }
    debouncedLoadMessages();
  };

  loadMessages();

  storeEmitter.on("ws:authStateUpdate", loadMessages, signal);

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
    messageListEl.remove();
    (messageListEl as any) = null;
  };

  return {
    destroy,
    render,
  };
};
