import { t } from "@lingui/core/macro";

import {
  searchChannelMessages,
  type SearchOpts,
} from "../../services/channelService";
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
import { Link } from "../ui/link";
import { MessageSkeleton } from "../ui/skeleton";

import style from "./SearchDrawer.module.css";

export const createSearchDrawer = () => {
  const ac = new AbortController();
  const { signal } = ac;

  let messageListEl = (
    <div class={style.messageContainer}></div>
  ) as HTMLDivElement;

  let searchInCurrentChannel = true;
  let newestFirst = true;

  const Filters = () => {
    const currentChannel = channelStore.currentChannel();
    const server = serverStore.currentServer();
    const name = currentChannel?.name || "";
    return (
      <div class={style.filtersContainer}>
        {server && (
          <Button
            data-action="search-in-current-channel"
            label={t`Search In #${name}`}
            primary={searchInCurrentChannel}
          />
        )}

        <Button data-action="newest" label={t`Newest`} primary={newestFirst} />
        <Button data-action="oldest" label={t`Oldest`} primary={!newestFirst} />
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
      if (closestFromEvent(event, `[data-action="newest"]`)) {
        newestFirst = true;
        rerenderFilters();
        loadMessages();
      }
      if (closestFromEvent(event, `[data-action="oldest"]`)) {
        newestFirst = false;
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

    let messages: RawMessage[] | null = null;

    const opts: SearchOpts = { query, order: newestFirst ? "desc" : "asc" };

    if (!serverId || searchInCurrentChannel) {
      const channelId = channelStore.currentChannel()?.id!;
      [messages] = await searchChannelMessages(channelId, opts);
    } else {
      [messages] = await searchServerMessages(serverId, opts);
    }
    messages = messages || [];

    if (signal.aborted) return;

    if (newestFirst) messages.reverse();
    isShowingSkeleton = false;

    messageListEl.replaceChildren(
      <>
        {messages.map((message, i) => {
          const prev = messages[i - 1];
          const channel = channelStore.channels.get(message.channelId);

          let link = "";

          if (channel?.serverId) {
            link = `/app/servers/${channel?.serverId}/${message.channelId}?messageId=${message.id}`;
          } else {
            link = `/app/inbox/${message.channelId}?messageId=${message.id}`;
          }

          return (
            <div class={style.messageContainer}>
              {!searchInCurrentChannel &&
                channel &&
                prev?.channelId !== message.channelId && (
                  <div class={style.channelHeader}>
                    <CdnIcon size={16} channel={channel} />
                    {channel?.name}
                  </div>
                )}
              <Link href={link} class={style.messageLink}>
                <MessageItem
                  container={messageListEl}
                  grouped={false}
                  hideNewDayMarker
                  message={new Message(message)}
                />
              </Link>
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
