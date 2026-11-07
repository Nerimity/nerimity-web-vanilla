import { t } from "@lingui/core/macro";

import {
  getApplicationBot,
  type GetApplicationBotResponse,
} from "../../services/applicationService";
import { inviteBot } from "../../services/serverService";
import { addBit, hasBit, removeBit } from "../../utils/bitwise";
import { closestFromEvent } from "../../utils/dom";
import { getLocalItem } from "../../utils/localStorage";
import { RolePermissionFlag } from "../../utils/RolePermissionFlag";
import { Banner } from "../Banner";
import { Icon } from "../icon";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dropdown } from "../ui/createDropdown";
import { createModal, Modal } from "../ui/modal";
import { Skeleton } from "../ui/skeleton";
import { createStatusMessage } from "../ui/StatusMessage";

import style from "./BotInviteModal.module.css";

export interface BotInviteModalOpts {
  page?: boolean;
  appId: string;
  perms: number;
}

export const _createBotInviteModal = (opts: BotInviteModalOpts) => {
  const ac = new AbortController();

  let perms = opts.perms;

  const body = (
    <Modal.Body class={style.serverInviteModal} width="400px">
      <Skeleton style={{ width: "100%", "aspect-ratio": "30/12" }} />
      <div class={style.serverInfo}>
        <Skeleton
          style={{ width: "80px", height: "80px", "border-radius": "50%" }}
        />
        <Skeleton
          style={{ width: "140px", height: "16px", "border-radius": "4px" }}
        />
        <Skeleton
          style={{ width: "80px", height: "12px", "border-radius": "4px" }}
        />
      </div>
    </Modal.Body>
  ) as HTMLDivElement;

  const footer = (
    <Modal.Footer>
      <Skeleton
        class={"button"}
        style={{ "min-width": "100px", height: "38px", "border-radius": "6px" }}
      />
      <Skeleton
        class={"button"}
        style={{ "min-width": "120px", height: "38px", "border-radius": "6px" }}
      />
    </Modal.Footer>
  ) as HTMLDivElement;

  const loggedIn = !!getLocalItem("userToken");

  const showError = (message: string) => {
    body.replaceChildren(
      <div class={style.errorContainer}>
        <Icon class={style.errorIcon} name={!loggedIn ? "login" : "error"} />
        <div>{message}</div>
      </div>,
    );

    if (!loggedIn) {
      footer.replaceChildren(
        <Button
          data-action="login"
          label={t`Login to Invite`}
          primary
          icon="login"
        />,
      );
      return;
    }
    footer.replaceChildren(
      <Button
        data-action="close"
        label={opts.page ? t`Back to Nerimity` : t`Close`}
        primary
        icon="home"
      />,
    );
  };

  let res: GetApplicationBotResponse | null = null;

  let selectedServerId = "";
  const status = createStatusMessage();

  const fetchDetails = async () => {
    if (!loggedIn) {
      showError(t`You must be logged in to view this page.`);
      return;
    }

    const [serverDetails, err] = await getApplicationBot({
      appId: opts.appId,
      includeServers: true,
    });
    res = serverDetails;

    if (err) {
      showError(err.message);
      return;
    }

    footer.replaceChildren(
      <>
        <Button
          label={opts.page ? t`Back to Nerimity` : t`Close`}

          data-action="close"
          hoverBorder
        />

        <Button label={t`Add Bot`} data-action="add-bot" icon="add" primary />
      </>,
    );

    const bot = res?.bot!;
    const creator = bot.application.creatorAccount.user;
    const servers = res?.servers ?? [];

    const serversDropdown = Dropdown.create({
      signal: ac.signal,
      initialSelectedId: () => selectedServerId,
      onChange(id) {
        selectedServerId = id;
      },
      items() {
        return [
          <Dropdown.Item id="">
            <Dropdown.Label>{t`Select Server`}</Dropdown.Label>
          </Dropdown.Item>,
          ...servers.map((server) => (
            <Dropdown.Item id={server.id}>
              <Dropdown.Label>{server.name}</Dropdown.Label>
            </Dropdown.Item>
          )),
        ];
      },
    });

    Checkbox.createHandler({
      signal: ac.signal,
      el: body,
      onChange(_, el) {
        const bit = parseInt(el.dataset.bit!);
        if (hasBit(perms, bit)) {
          perms = removeBit(perms, bit);
        } else {
          perms = addBit(perms, bit);
        }
      },
    });
    body.replaceChildren(
      <>
        <Banner user={bot} />
        <div class={style.serverInfo}>
          <Avatar user={bot} size={80} />
          <div class={style.serverName}>{res?.bot.username}</div>
          <div class={style.statsRow}>
            <div class={style.stat}>
              By <span class={style.statValue}>{creator?.username}</span>
            </div>
          </div>

          <div class={style.permissionsContainer}>
            {Object.values(RolePermissionFlag).map((perm) => (
              <Checkbox.Root
                data-bit={perm.bit}
                checked={hasBit(perms, perm.bit)}
              >
                <Checkbox.Box />
                <Checkbox.Label>{perm.name()}</Checkbox.Label>
              </Checkbox.Root>
            ))}
          </div>
          {serversDropdown.el}
          {status.element}
        </div>
      </>,
    );
  };
  fetchDetails();

  const modalEl = (
    <Modal.Root
      ignoreBgClick={opts.page}
      initialFullHeight={opts.page}
      disableGestureClose={opts.page}
    >
      {body}
      {footer}
    </Modal.Root>
  ) as HTMLDivElement;

  let joining = false;
  modalEl.addEventListener(
    "click",
    async (e) => {
      const actionEl = closestFromEvent(e, "[data-action]");
      const action = actionEl?.dataset.action;
      if (action === "close") {
        if (!opts.page) return ac.abort();

        location.href = "/app";
      }

      if (action === "login") {
        location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`;
      }
      if (action === "add-bot") {
        if (!selectedServerId) {
          status.set(t`Please select a server`);
          return;
        }
        if (joining) return;
        status.set();
        joining = true;
        const labelEl = actionEl?.querySelector(".label") as HTMLSpanElement;
        labelEl.textContent = t`Adding...`;

        const [, err] = await inviteBot({
          serverId: selectedServerId,
          appId: opts.appId,
          perms: perms,
        });
        labelEl.textContent = t`Add Bot`;
        joining = false;
        if (err) {
          status.set(err.message);
          return;
        }
        status.set(t`Bot added successfully`, "success");
      }
    },
    { signal: ac.signal },
  );

  createModal(() => modalEl, ac);
};
