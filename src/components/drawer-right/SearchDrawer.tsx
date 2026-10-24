import { t } from "@lingui/core/macro";

import { searchChannelMessages } from "../../services/channelService";
import { searchServerMessages } from "../../services/serverService";
import { channelStore } from "../../store/channelStore";
import { Message } from "../../store/messageStore";
import { serverStore } from "../../store/serverStore";
import type { RawMessage } from "../../Types";
import { debounce } from "../../utils/debounce";
import { closestFromEvent } from "../../utils/dom";
import { CdnIcon } from "../cdnIcon";
import { MessageItem } from "../message-pane/messageItem";
import { Button } from "../ui/button";

import style from "./SearchDrawer.module.css";

export const createSearchDrawer = () => {
  const ac = new AbortController();
  const { signal } = ac;

  let messageListEl = (
    <div class={style.messageContainer}></div>
  ) as HTMLDivElement;

  let searchInCurrentChannel = false;

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

  let el = (
    <div class={style.container}>
      <Filters />
      {messageListEl}
    </div>
  ) as HTMLDivElement;

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
      [messages] = await searchChannelMessages({ channelId });
    } else {
      [messages] = await searchServerMessages({ serverId });
    }

    if (signal.aborted) return;

    messages?.reverse();

    if (!messages?.length) return;

    messageListEl.replaceChildren(
      <>
        {messages.map((message, i) => {
          const prev = messages[i - 1];
          const channel = channelStore.channels.get(message.channelId);
          return (
            <div class={style.messageContainer}>
              {channel && (
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
                prevMessage={prev && new Message(prev)}
              />
            </div>
          );
        })}
      </>,
    );
  }, 800);

  const loadMessages = () => {
    messageListEl.replaceChildren();
    debouncedLoadMessages();
  };

  loadMessages();

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
