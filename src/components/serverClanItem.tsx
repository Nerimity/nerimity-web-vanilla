import { css } from "@linaria/core";

import { h } from "../h";
import type { ServerClan } from "../Types";
import { CdnIcon } from "./cdnIcon";

const clanItem = css`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background-color: var(--slate-700);
  border-radius: var(--radius-5);
  padding-right: 4px;
  .clanName {
    font-size: 12px;
    font-weight: bold;
  }
  .clanIcon {
    background-color: transparent;
    padding: 2px;
    img {
      border-radius: var(--radius-4);
    }
  }
`;

export const ServerClanItem = (props: { clan: ServerClan }) => {
  return (
    <span class={clanItem}>
      <CdnIcon clan={props.clan} class="clanIcon" size={14} />
      <span class="clanName">{props.clan.tag}</span>
    </span>
  );
};
