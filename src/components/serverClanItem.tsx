import { h } from "../h";
import type { ServerClan } from "../Types";
import { CdnIcon } from "./cdnIcon";

import style from "./serverClanItem.module.css";

export const ServerClanItem = (props: { clan: ServerClan }) => {
  return (
    <span class={style.clanItem}>
      <CdnIcon
        clan={props.clan}
        class={[style.clanIcon, "clanIcon"]}
        size={14}
      />
      <span class={style.clanName}>{props.clan.tag}</span>
    </span>
  );
};
