import { t } from "@lingui/core/macro";

import type { ServerClan } from "../Types";
import { CdnIcon } from "./cdnIcon";
import { InviteEmbed } from "./message-pane/InviteEmbed";
import { createModal, Modal } from "./modal";

import style from "./serverClanItem.module.css";

const elementToClan = new WeakMap<HTMLDivElement, ServerClan>();

export const ServerClanItem = (props: { clan: ServerClan }) => {
  const clanEl = (
    <span class={style.clanItem}>
      <CdnIcon
        clan={props.clan}
        class={[style.clanIcon, "clanIcon"]}
        size={14}
      />
      <span class={style.clanName}>{props.clan.tag}</span>
    </span>
  );

  elementToClan.set(clanEl as HTMLDivElement, props.clan);

  return clanEl;
};

const createClanClickHandler = () => {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLDivElement;
    const clanEl = target.closest(`.${style.clanItem}`) as HTMLDivElement;
    if (!clanEl) return;
    const clan = elementToClan.get(clanEl);
    if (!clan) return;
    createClanDetailsModal({ clan });
  });
};
createClanClickHandler();

const createClanDetailsModal = (opts: { clan: ServerClan }) => {
  const ac = new AbortController();

  const el = (
    <Modal.Root>
      <Modal.Header icon="face" label={t`Server Clan`} />
      <Modal.Body>
        <div class={style.detailsModal}>
          <CdnIcon clan={opts.clan} class={style.modalEmoji} size={60} />
          <div>{opts.clan.tag}</div>

          {opts.clan.serverId && <InviteEmbed code={opts.clan.serverId} clan />}
        </div>
      </Modal.Body>
    </Modal.Root>
  );

  createModal(() => el, ac);
};
