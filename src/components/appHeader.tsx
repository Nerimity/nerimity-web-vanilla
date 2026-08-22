import { t } from "@lingui/core/macro";

import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { inboxStore } from "../store/inboxStore";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { storeEmitter } from "../utils/EventEmitter";
import { router } from "../utils/router";
import { Button } from "./button";
import { Drawer } from "./drawer";
import { createPillUpdater, Pill } from "./Pill";

import style from "./appHeader.module.css";

let overrideIcon = "";
let overrideLabel = "";

const AppPill = () => {
  const server = serverStore.servers.get(serverStore.currentServerId!);
  const channel = channelStore.channels.get(channelStore.currentChannelId!);
  const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);
  const user = inbox ? userStore.users.get(inbox.recipientId)! : null;

  const authError = accountStore.authError;
  const authenticated = accountStore.authenticated;
  const isProfilePage = router.match("/app/profile/:id");

  const getLabel = () => {
    if (!authenticated) return accountStore.connectionState();
    if (overrideLabel) return overrideLabel;
    if (channel?.name) return channel.name;
    if (user?.username) return user.username;
    return isProfilePage ? t`Profile` : t`Home`;
  };

  const getIcon = () => {
    if (authError) return "gpp_maybe";
    if (!authenticated) return "cached";
    if (overrideIcon) return overrideIcon;
    if (server || channel) return null;
    return isProfilePage ? "article_person" : "home";
  };

  const label = getLabel();
  const icon = getIcon();

  return (
    <Pill
      server={server}
      user={user}
      channel={channel}
      label={label}
      icon={icon}
      warn={!authenticated}
      error={!!authError}
    />
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

  let headerContainer = (
    <header class={style.header}>
      {leftDrawerButton}
      <div class={style.details}>
        <AppPill />
      </div>
      {rightDrawerButton}
    </header>
  ) as HTMLDivElement;

  let container = (
    <>
      {headerContainer}
      <div class={style.backdrop}></div>
    </>
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

  const updatePill = createPillUpdater(() => headerContainer, AppPill);

  storeEmitter.on("ws:authStateUpdate", updatePill, signal);
  storeEmitter.on("ws:connectStateUpdate", updatePill, signal);

  window.addEventListener(
    "navigate",
    () => {
      requestAnimationFrame(updatePill);
    },
    { signal: signal },
  );

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

  const updateHeader = (opts?: {
    label?: string;
    icon?: string;
    trigger?: boolean;
  }) => {
    overrideIcon = opts?.icon || "";
    overrideLabel = opts?.label || "";
    if (opts?.trigger === false) return;
    updatePill();
  };

  const destroy = () => {
    abortController.abort();
    container.remove();
    headerContainer.remove();
    (rightDrawerButton as any) = null;
    (container as any) = null;
    (headerContainer as any) = null;
  };
  return { render, destroy, updateHeader };
};
