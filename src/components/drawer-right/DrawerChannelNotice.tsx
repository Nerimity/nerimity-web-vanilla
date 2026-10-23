import { t } from "@lingui/core/macro";

import { getOrCacheChannelNotice } from "../../services/channelService";
import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Markup } from "../markup/markup";

import style from "./DrawerChannelNotice.module.css";

export const DrawerChannelNotice = (props: { signal: AbortSignal }) => {
  const noticeContentEl = (<div class={style.content}></div>) as HTMLDivElement;

  const el = (
    <div style={{ display: "none" }} class={style.notice}>
      <div class={style.title}>{t`Notice`}</div>
      {noticeContentEl}
    </div>
  ) as HTMLDivElement;

  const fetch = () => {
    el.style.display = "none";
    if (!accountStore.authenticated) return;
    const channelId = channelStore.currentChannelId;
    if (!channelId) return;
    getOrCacheChannelNotice(channelId).then((notice) => {
      if (!notice) return;
      noticeContentEl.replaceChildren(<Markup inline text={notice} />);
      el.style.display = "flex";
    });
  };

  storeEmitter.on("navigate:channelId", fetch, props.signal);
  storeEmitter.on("ws:authStateUpdate", fetch, props.signal);
  fetch();

  return el;
};
