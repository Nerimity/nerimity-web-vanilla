import { css } from "@linaria/core";

import { h } from "../h";
import {
  UserPresenceDetails,
  userPresenceStore,
} from "../store/userPresenceStore";
import { Markup } from "./markup/markup";

const userPresence = css`
  display: flex;
  align-items: center;
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .text {
    margin-left: 4px;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
`;

export const UserPresence = (props: {
  userId: string;
  showOffline?: boolean;
}) => {
  const presence = userPresenceStore.presences.get(props.userId);
  const status = UserPresenceDetails[presence?.status || 0];

  if (!presence && !props.showOffline) {
    return null;
  }

  let label = status.text;
  if (presence?.custom) {
    label = presence.custom;
  }

  return (
    <span class={userPresence}>
      <div
        class="dot"
        style={{ background: `var(--status-${status.id})` }}
      ></div>
      <Markup class="text" text={label} inline />
    </span>
  );
};
