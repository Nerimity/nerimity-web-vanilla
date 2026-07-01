import { t } from "@lingui/core/macro";
import morphdom from "morphdom";

import { h } from "../h";
import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { inboxStore } from "../store/inboxStore";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { storeEmitter } from "../utils/EventEmitter";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { CdnIcon } from "./cdnIcon";
import { Drawer } from "./drawer";
import { Icon } from "./icon";

import style from "./appHeader.module.css";

const Pill = () => {
  const server = serverStore.servers.get(serverStore.currentServerId!);
  const channel = channelStore.channels.get(channelStore.currentChannelId!);
  const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);
  const user = !inbox ? null : userStore.users.get(inbox.recipientId)!;

  const authError = accountStore.authError;
  const authenticated = accountStore.authenticated;
  const label = !accountStore.authenticated
    ? accountStore.connectionState()
    : channel?.name || user?.username || t`Home`;
  const icon = authError
    ? "gpp_maybe"
    : !authenticated
      ? "cached"
      : !server && !channel
        ? "home"
        : null;

  const isServerChannel = server && channel;

  return (
    <div class={style.pill}>
      {icon ? (
        <Icon
          name={icon}
          class={[
            style.icon,
            !authenticated && style.warn,
            !!authError && style.error,
          ]}
        />
      ) : (
        <Avatar size={24} server={server} user={user} />
      )}
      {authenticated && isServerChannel ? (
        <CdnIcon channel={channel} size={14} class={style.channelIcon} />
      ) : null}
      <div class={style.label}>{label}</div>
    </div>
  );
};

export const createAppHeader = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const leftDrawerButton = (
    <Button icon="side_navigation" class={style.button} />
  ) as HTMLButtonElement;

  let rightDrawerButton = (
    <Button icon="info" class={style.button} />
  ) as HTMLButtonElement;

  let container = (
    <header class={style.header}>
      <div class={style.backdrop}></div>
      {leftDrawerButton}
      <div class={style.details}>
        <Pill />
      </div>
      {rightDrawerButton}
    </header>
  ) as unknown as HTMLDivElement;

  leftDrawerButton.addEventListener(
    "click",
    () => {
      Drawer().updatePage({ page: 0, toggleLeftDesktop: true });
    },
    { signal },
  );

  rightDrawerButton.addEventListener(
    "click",
    () => {
      Drawer().updatePage({ page: 2, toggleRightDesktop: true });
    },
    { signal },
  );

  let pendingAnim: Animation | null = null;

  const updatePill = () => {
    const pillEl = container.querySelector(`.${style.pill}`) as HTMLElement;

    const oldWidth = pillEl.getBoundingClientRect().width;

    pendingAnim?.cancel();
    pendingAnim = null;

    morphdom(pillEl, <Pill />);

    const newLabelEl = pillEl.querySelector("." + style.label) as HTMLElement;

    const newWidth = pillEl.getBoundingClientRect().width;

    if (oldWidth !== newWidth) {
      newLabelEl.style.textOverflow = "clip";
      pillEl.animate([{ width: `${oldWidth}px` }, { width: `${newWidth}px` }], {
        duration: 200,
        easing: "ease",
        fill: "none",
      }).onfinish = () => {
        newLabelEl.style.textOverflow = "";
      };
    }

    pendingAnim = newLabelEl.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 260,
      easing: "ease",
      fill: "forwards",
    });
    pendingAnim.onfinish = () => {
      pendingAnim = null;
    };
  };

  storeEmitter.on("ws:authStateUpdate", updatePill, signal);
  storeEmitter.on("ws:connectStateUpdate", updatePill, signal);
  storeEmitter.on("navigate:channelId", updatePill, signal);
  storeEmitter.on(
    "drawer:rightDrawerAvailable",
    (available) => {
      rightDrawerButton.classList.toggle(style.hide!, !available);
    },
    signal,
  );

  const render = () => {
    return container;
  };
  const destroy = () => {
    abortController.abort();
    container.remove();
    (rightDrawerButton as any) = null;
    (container as any) = null;
  };
  return { render, destroy };
};
