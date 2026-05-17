import { css } from "@linaria/core";
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
  place-self: start;
  border: solid 1px var(--gray-700);
  padding-right: 12px;
  > .channelIcon {
    margin-left: 4px;
    margin-right: 4px;
    background-color: transparent;
  }
  > .icon {
    border-radius: var(--radius-max);
    background-color: var(--gray-700);
    padding: 4px;
    margin-right: 4px;
    font-size: 16px;
  }
`;

const Pill = () => {
  const server = serverStore.servers.get(serverStore.currentServerId!);
  const channel = channelStore.channels.get(channelStore.currentChannelId!);

  const label = !accountStore.authenticated
    ? accountStore.connectionState()
    : null;
  const icon = !accountStore.authenticated ? "cached" : null;

  return (
    <div class={pill}>
      {icon ? (
        <Icon name={icon} class="icon" />
      ) : (
        <Avatar size={24} server={server} />
      )}
      {channel ? (
        <CdnIcon channel={channel} size={14} class="channelIcon" />
      ) : null}
      <div>{label || channel?.name}</div>
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
    > .icon {
      font-size: 18px;
    }
  }
  > .details {
    display: flex;
    flex: 1;
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
      Drawer().updatePage({ page: 0 });
    },
    { signal },
  );

  rightDrawerButton.addEventListener(
    "click",
    () => {
      Drawer().updatePage({ page: 2 });
    },
    { signal },
  );

  const updatePill = () => {
    morphdom(container.querySelector(`.${pill}`)!, <Pill />);
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
