import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";
import morphdom from "morphdom";

import { h } from "../h";
import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { serverStore } from "../store/serverStore";
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
  white-space: nowrap;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  > .channelIcon {
    margin-left: 4px;
    margin-right: 4px;
    background-color: transparent;
  }
  > .icon {
    border-radius: var(--radius-max);
    background-color: var(--gray-800);
    padding: 4px;
    margin-right: 4px;
    font-size: 16px;
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

  const authenticated = accountStore.authenticated;

  const label = !accountStore.authenticated
    ? accountStore.connectionState()
    : channel?.name || t`Home`;
  const icon = !authenticated ? "cached" : !server ? "home" : null;

  return (
    <div class={pill}>
      {icon ? (
        <Icon name={icon} class="icon" />
      ) : (
        <Avatar size={24} server={server} />
      )}
      {authenticated && channel ? (
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
    height: 160px;

    z-index: -1;

    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.7),
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

  const updatePill = () => {
    const pillEl = container.querySelector(`.${pill}`) as HTMLElement;
    const oldWidth = pillEl.getBoundingClientRect().width;

    morphdom(pillEl, <Pill />);

    const newWidth = pillEl.getBoundingClientRect().width;

    if (oldWidth !== newWidth) {
      const labelEl = pillEl.querySelector(".label") as HTMLElement;
      labelEl.style.textOverflow = "clip";

      const anim = pillEl.animate(
        [{ width: `${oldWidth}px` }, { width: `${newWidth}px` }],
        { duration: 200, easing: "ease", fill: "none" },
      );

      anim.onfinish = () => {
        labelEl.style.textOverflow = "";
      };
    }
  };

  storeEmitter.on("ws:authStateUpdate", updatePill, signal);
  storeEmitter.on("ws:connectStateUpdate", updatePill, signal);
  storeEmitter.on("navigate:channelId", updatePill, signal);

  const render = () => {
    return container;
  };
  const destroy = () => {
    abortController.abort();
    container.remove();
  };
  return { render, destroy };
};
