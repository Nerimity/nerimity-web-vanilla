import { t } from "@lingui/core/macro";

import { h } from "../../h";
import { channelStore } from "../../store/channelStore";
import type { Message } from "../../store/messageStore";
import { serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { resolveGradient } from "../../utils/color";
import { storeEmitter } from "../../utils/EventEmitter";
import { reconcile } from "../../utils/html";
import { getLocalItem, setLocalItem } from "../../utils/localStorage";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { GradientText } from "../gradientText";
import { Icon } from "../icon";
import { Markup } from "../markup/markup";

import style from "./repliesIndicator.module.css";

const MessageItem = (props: { message: Message }) => {
  const creator = props.message.createdBy;

  const member = serverMemberStore.serverMembers
    .get(serverStore.currentServerId!)
    ?.get(creator.id);

  const name = member?.nickname || creator.username;

  const topRoleColor = serverStore.memberTopColor(member);

  const color = resolveGradient(topRoleColor) ?? "";

  return (
    <div class={style.messageItem} data-message-id={props.message.id}>
      <Avatar user={creator} size={14} imgClass="avatar" />
      <div class={style.content}>
        <GradientText class={style.username} color={color}>
          {name}
        </GradientText>
        <Markup
          class={style.message}
          text={props.message.content}
          inline
          message={props.message}
          serverId={serverStore.currentServerId}
        />
      </div>
      <Button
        alert
        icon="close"
        class={style.deleteButton}
        data-action="delete"
      />
    </div>
  );
};

export const createRepliesIndicator = (abortController: AbortController) => {
  const { signal } = abortController;
  let listEl = (<div class={style.list}></div>) as HTMLDivElement;
  let countPill = (<div class={style.pill}></div>) as HTMLDivElement;
  let el = (
    <div class={[style.repliesIndicator, style.hide]}>
      {listEl}
      <div class={style.status}>
        <Icon class={style.icon} name="reply" />
        {countPill}
        <Checkbox.Root
          checked={getLocalItem("messageReplyShouldMention", true)!}
          class={style.checkbox}
        >
          <Checkbox.Box />
          <Checkbox.Label>{t`Mention`}</Checkbox.Label>
        </Checkbox.Root>
      </div>
    </div>
  ) as HTMLDivElement;

  const rerender = () => {
    const property = channelStore.currentChannelProperty();
    const replies = property?.replyingMessages;
    el.classList.toggle(style.hide!, !replies?.length);
    if (!replies?.length) {
      listEl.replaceChildren();
      return;
    }

    countPill.innerText = `${replies.length}/5`;

    reconcile({
      container: listEl,
      dataAttr: "message-id",
      values: replies,
      valueId: "id",
      create(item) {
        return <MessageItem message={item} />;
      },
    });
  };

  el.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const deleteButton = target.closest(`.${style.deleteButton}`);
      if (deleteButton) {
        const item = deleteButton.closest(
          `.${style.messageItem}`,
        ) as HTMLDivElement;
        const messageId = item?.dataset.messageId;
        if (!messageId) return;
        channelStore.removeReply(channelStore.currentChannelId!, messageId);
      }
    },
    { signal },
  );

  Checkbox.createHandler({
    el,
    onChange: (checked) => {
      setLocalItem("messageReplyShouldMention", checked);
    },
    signal,
  });

  storeEmitter.on("message_property:replying", rerender, signal);
  storeEmitter.on("navigate:channelId", rerender, signal);

  signal.addEventListener("abort", () => {
    listEl.remove();
    countPill.remove();
    el.remove();
    (listEl as any) = null;
    (countPill as any) = null;
    (el as any) = null;
  });

  return el;
};
