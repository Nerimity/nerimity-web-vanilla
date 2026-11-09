import { t } from "@lingui/core/macro";

import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { inboxStore } from "../store/inboxStore";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import type { RawUser } from "../Types";
import { closestFromEvent } from "../utils/dom";
import { storeEmitter } from "../utils/EventEmitter";
import { isChannelRoute, router } from "../utils/router";
import { createMentionsModal } from "./modals/MentionsModal";
import { createPinsModal } from "./modals/PinsModal";
import { createPillUpdater, Pill } from "./Pill";
import { Button } from "./ui/button";
import { Drawer } from "./ui/drawer";

import style from "./appHeader.module.css";

let overrideIcon = "";
let overrideLabel = "";
let overrideUser: RawUser | null = null;

const AppPill = () => {
  const server = serverStore.servers.get(serverStore.currentServerId!);
  const channel = channelStore.channels.get(channelStore.currentChannelId!);
  const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);
  const inboxUser = inbox ? userStore.users.get(inbox.recipientId)! : null;

  const authError = accountStore.authError;
  const authenticated = accountStore.authenticated;
  const profileRoute = router.match<{ userId: string }>("/app/profile/:userId");
  const isProfilePage = !!profileRoute;
  const profileUser =
    profileRoute && overrideUser?.id === profileRoute.params.userId
      ? overrideUser
      : null;

  const isExplorePage = !!router.match("/app/explore{/*}?");

  const getLabel = () => {
    if (!authenticated) return accountStore.connectionState();
    if (overrideLabel) return overrideLabel;
    if (isProfilePage) return profileUser?.username || t`Profile`;
    if (isExplorePage) return t`Explore`;
    if (channel?.name) return channel.name;
    if (inboxUser?.username) return inboxUser.username;
    return t`Home`;
  };

  const getIcon = () => {
    if (authError) return "gpp_maybe";
    if (!authenticated) return "cached";
    if (overrideIcon) return overrideIcon;
    if (isProfilePage) return profileUser ? null : "article_person";
    if (isExplorePage) return "explore";
    if (server || channel) return null;
    return "home";
  };

  const label = getLabel();
  const icon = getIcon();

  return (
    <Pill
      server={isProfilePage ? undefined : server}
      user={isProfilePage ? profileUser : inboxUser}
      channel={isProfilePage ? undefined : channel}
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

  let headerContainer = (
    <header class={style.header}>
      <Button
        data-action="toggle_left_drawer"
        icon="side_navigation"
        class={style.button}
      />
      <div class={style.details}>
        <AppPill />
      </div>
      <div class={style.actions}>
        <Button
          data-action="show_pins_popup"
          icon="push_pin"
          class={style.button}
        />
        <Button
          data-action="show_mentions_popup"
          icon="alternate_email"
          class={style.button}
        />
        <Button
          data-action="toggle_right_drawer"
          icon="info"
          class={style.button}
        />
      </div>
    </header>
  ) as HTMLDivElement;

  let container = (
    <>
      {headerContainer}
      <div class={style.backdrop}></div>
    </>
  ) as unknown as HTMLDivElement;

  headerContainer.addEventListener(
    "click",
    (e) => {
      const actionEl = closestFromEvent(e, "[data-action]");
      if (!actionEl) return;
      const action = actionEl.dataset.action!;
      if (action === "toggle_left_drawer") {
        Drawer().updatePage({ page: 0, toggleLeftDesktop: true });
      }
      if (action === "toggle_right_drawer") {
        Drawer().updatePage({ page: 2, toggleRightDesktop: true });
      }
      if (action === "show_mentions_popup") {
        const rect = actionEl.getBoundingClientRect();
        createMentionsModal({
          pos: {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height + 4,
          },
        });
      }
      if (action === "show_pins_popup") {
        const rect = actionEl.getBoundingClientRect();
        createPinsModal({
          pos: {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height + 4,
          },
        });
      }
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
      const rightDrawerButton = headerContainer.querySelector(
        "[data-action=toggle_right_drawer]",
      ) as HTMLButtonElement;
      rightDrawerButton.classList.toggle(style.hide!, !available);
    },
    signal,
  );

  const render = () => {
    return container;
  };

  router.createMatchListener(
    "/*",
    () => {
      const pinPopupBtn = headerContainer.querySelector<HTMLDivElement>(
        "[data-action=show_pins_popup]",
      )!;
      pinPopupBtn.style.display = isChannelRoute() ? "block" : "none";
    },
    { signal, always: true },
  );

  const updateHeader = (opts?: {
    label?: string;
    icon?: string;
    user?: RawUser | null;
    trigger?: boolean;
  }) => {
    overrideIcon = opts?.icon || "";
    overrideLabel = opts?.label || "";
    overrideUser = opts?.user || null;
    if (opts?.trigger === false) return;
    updatePill();
  };

  const destroy = () => {
    abortController.abort();
    container.remove();
    headerContainer.remove();
    (container as any) = null;
    (headerContainer as any) = null;
  };
  return { render, destroy, updateHeader };
};
