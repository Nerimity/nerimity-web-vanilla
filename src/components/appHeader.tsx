import { css } from "@linaria/core";
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

const pill = css`
  display: flex;
  align-items: center;
  font-size: 12px;
  background-color: var(--gray-900);
  padding: 0 6px;
  height: 36px;
  border-radius: var(--radius-max);
  border: solid 1px var(--gray-700);
  padding-right: 12px;
  overflow: hidden;
  min-width: 0;
  gap: 6px;
  white-space: nowrap;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  > .channelIcon {
    background-color: transparent;
  }
  > .icon {
    border-radius: var(--radius-max);
    background-color: var(--gray-800);
    padding: 4px;
    margin-right: 4px;
    font-size: 16px;
    &.warn {
      background-color: var(--warn-color);
    }
  }
  > .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Pill = () => {
  const server = serverStore.servers.get(serverStore.currentServerId!);
  const channel = channelStore.channels.get(channelStore.currentChannelId!);
  const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);
  const user = !inbox ? null : userStore.users.get(inbox.recipientId)!;

  const authenticated = accountStore.authenticated;
  const label = !accountStore.authenticated
    ? accountStore.connectionState()
    : channel?.name || user?.username || t`Home`;
  const icon = !authenticated ? "cached" : !server && !channel ? "home" : null;

  const isServerChannel = server && channel;

  return (
    <div class={pill}>
      {icon ? (
        <Icon name={icon} class={["icon", !authenticated && "warn"]} />
      ) : (
        <Avatar size={24} server={server} user={user} />
      )}
      {authenticated && isServerChannel ? (
        <CdnIcon channel={channel} size={14} class="channelIcon" />
      ) : null}
      <div class="label">{label}</div>
    </div>
  );
};

const header = css`
  display: flex;
  align-items: center;
  height: 50px;
  padding-left: 8px;
  padding-right: 8px;
  flex-shrink: 0;
  gap: 8px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1111;
  > .button {
    border-radius: var(--radius-max);
    flex-shrink: 0;
    > .icon {
      font-size: 18px;
    }
    &.hide {
      display: none;
    }
  }
  > .details {
    display: flex;
    flex: 1;
    max-width: 100%;
    min-width: 0;
  }
  .backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 70px;

    z-index: -1;

    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.85),
      rgba(0, 0, 0, 0)
    );
    pointer-events: none;
  }
`;
export const createAppHeader = () => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const leftDrawerButton = (
    <Button icon="side_navigation" class="button" />
  ) as HTMLButtonElement;

  const rightDrawerButton = (
    <Button icon="info" class="button" />
  ) as HTMLButtonElement;

  const container = (
    <header class={header}>
      <div class="backdrop"></div>
      {leftDrawerButton}
      <div class="details">
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
    const pillEl = container.querySelector(`.${pill}`) as HTMLElement;

    const oldWidth = pillEl.getBoundingClientRect().width;

    pendingAnim?.cancel();
    pendingAnim = null;

    morphdom(pillEl, <Pill />);

    const newLabelEl = pillEl.querySelector(".label") as HTMLElement;

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
      rightDrawerButton.classList.toggle("hide", !available);
    },
    signal,
  );

  const render = () => {
    return container;
  };
  const destroy = () => {
    abortController.abort();
    container.remove();
  };
  return { render, destroy };
};
