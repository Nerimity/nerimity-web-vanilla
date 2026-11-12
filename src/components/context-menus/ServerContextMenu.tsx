import { t } from "@lingui/core/macro";

import { leaveServer } from "../../services/serverService";
import { accountStore } from "../../store/accountStore";
import { ServerMember, serverMemberStore } from "../../store/serverMemberStore";
import { Server, serverStore } from "../../store/serverStore";
import { NotificationMode } from "../../Types";
import { closestFromEvent } from "../../utils/dom";
import { router } from "../../utils/router";
import { Button } from "../ui/button";
import { ContextMenu } from "../ui/ContextMenu";
import { alert, createModal, Modal } from "../ui/modal";
import { Radiobox } from "../ui/radiobox";

import style from "./ServerContextMenu.module.css";

export const createServerContextMenuHandler = (opts: {
  shouldSkip?: (target: HTMLElement) => boolean;
  el?: HTMLElement;
  data?: Record<string, any>;
  signal: AbortSignal;
  mode?: "contextmenu" | "click" | "manual";
}) => {
  return ContextMenu.createHandler({
    mode: opts.mode,
    el: opts.el,
    signal: opts.signal,
    selector: "[data-server-id]",
    attr: "serverId",
    shouldSkip: opts.shouldSkip,
    resolveData: (serverId) => ({
      server: serverStore.servers.get(serverId),
      member: serverMemberStore.currentMember(serverId),
      ...opts.data,
    }),
    submenus: [
      {
        id: "notifications",
        render: ({ data, pos }) => (
          <ContextMenu.SubmenuRoot pos={pos}>
            <NotificationsSubmenu serverId={data.server?.id!} />
          </ContextMenu.SubmenuRoot>
        ),
      },
    ],
    renderMenu: ({ x, y, data, signal }) => {
      const el = (
        <ServerContextMenu
          x={x}
          y={y}
          server={data.server!}
          member={data.member!}
        />
      ) as HTMLDivElement;

      Radiobox.createHandler({
        onChange(event) {
          event.el
            .closest(".submenu")
            ?.replaceChildren(
              <NotificationsSubmenu serverId={data.server?.id!} />,
            );
        },
        signal,
        el,
      });

      return el;
    },
    onAction: (actionId, { id: serverId, data }) => {
      switch (actionId) {
        case "settings":
          router.navigate(`/app/servers/${serverId}/settings`);
          break;
        case "leave":
          LeaveServerModal(serverId);
          break;
        case "copy_id":
          navigator.clipboard.writeText(serverId);
          break;
        case "copy_object":
          console.log("Copied Object to clipboard", data);
          navigator.clipboard.writeText(JSON.stringify(data));
          break;
      }
    },
  });
};

const ServerContextMenu = (props: {
  x: string;
  y: string;
  server: Server;
  member: ServerMember;
}) => {
  const isServerOwner = props.server.createdById === props.member.userId;

  return (
    <ContextMenu.Root pos={{ x: props.x, y: props.y }} id="user-ctx">
      <ContextMenu.Item id="notifications">
        <ContextMenu.Icon name="notifications" />
        <ContextMenu.Label>{t`Notifications`}</ContextMenu.Label>
        <ContextMenu.Icon name="chevron_right" />
      </ContextMenu.Item>
      <ContextMenu.Item id="settings">
        <ContextMenu.Icon name="settings" />
        <ContextMenu.Label>{t`Settings`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Separator />
      {!isServerOwner && (
        <ContextMenu.Item id="leave" alert>
          <ContextMenu.Icon name="logout" />
          <ContextMenu.Label>{t`Leave`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      <ContextMenu.Separator />

      <ContextMenu.Item id="copy_id">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy ID`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Item id="copy_object">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy Object`}</ContextMenu.Label>
      </ContextMenu.Item>
    </ContextMenu.Root>
  );
};

const NotificationsSubmenu = (props: { serverId: string }) => {
  return (
    <>
      <div>{t`Ping`}</div>

      <Radiobox.Group id="server-ping-mode" class={style.radioGroup}>
        <NotificationItem
          value={NotificationMode.ALL}
          serverId={props.serverId}
          label={t`Everything`}
          type="PING"
        />
        <NotificationItem
          value={NotificationMode.MENTIONS_ONLY}
          serverId={props.serverId}
          label={t`Mentions Only`}
          type="PING"
        />
        <NotificationItem
          value={NotificationMode.MUTE}
          serverId={props.serverId}
          label={t`Mute`}
          type="PING"
        />
      </Radiobox.Group>

      <div>{t`Sound`}</div>
      <Radiobox.Group id="server-sound-mode" class={style.radioGroup}>
        <NotificationItem
          value={NotificationMode.ALL}
          serverId={props.serverId}
          label={t`Everything`}
          type="SOUND"
        />
        <NotificationItem
          value={NotificationMode.MENTIONS_ONLY}
          serverId={props.serverId}
          label={t`Mentions Only`}
          type="SOUND"
        />
        <NotificationItem
          value={NotificationMode.MUTE}
          serverId={props.serverId}
          label={t`Mute`}
          type="SOUND"
        />
        <ContextMenu.Item id="settings">
          <ContextMenu.Icon name="settings" />
          <ContextMenu.Label>Settings</ContextMenu.Label>
        </ContextMenu.Item>
      </Radiobox.Group>
    </>
  );
};

const notificationPingMode = (serverId: string) =>
  accountStore.notificationSettings.get(serverId)?.notificationPingMode ?? 0;

const notificationSoundMode = (serverId: string) =>
  accountStore.notificationSettings.get(serverId)?.notificationSoundMode ?? 0;

const NotificationItem = (props: {
  label: string;
  type: "SOUND" | "PING";
  value: NotificationMode;
  serverId: string;
}) => {
  let disabled = false;

  if (props.type === "SOUND") {
    if (
      notificationPingMode(props.serverId) === NotificationMode.MENTIONS_ONLY &&
      props.value === NotificationMode.ALL
    ) {
      disabled = true;
    }

    if (notificationPingMode(props.serverId) === NotificationMode.MUTE) {
      disabled = true;
    }
  }

  const selected =
    props.type === "PING"
      ? props.value === notificationPingMode(props.serverId)
      : props.value === notificationSoundMode(props.serverId);

  return (
    <ContextMenu.Item
      disableCloseOnClick
      disabled={disabled}
      class={style.radioBoxContainer}
    >
      <Radiobox.Root class={style.radioBox} checked={selected}>
        <Radiobox.Box />
        <Radiobox.Label>{props.label}</Radiobox.Label>
      </Radiobox.Root>
    </ContextMenu.Item>
  );
};

const LeaveServerModal = (serverId: string) => {
  const server = serverStore.servers.get(serverId)!;
  const serverName = server.name;

  const ac = new AbortController();
  const { signal } = ac;

  const el = (
    <Modal.Root>
      <Modal.Header alert icon="logout" label={t`Leave ${serverName}`} />
      <Modal.Body>
        <div>{t`Are you sure you want to leave ${serverName}?`}</div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          data-action="close"
          hoverBorder
          icon="close"
          label={t`Don't Leave`}
        />
        <Button
          data-action="leave"
          alert
          icon="logout"
          primary
          label={t`Leave Server`}
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  const updateButton = () => {
    const btnLbl = el.querySelector(
      `[data-action="leave"] .label`,
    ) as HTMLDivElement;
    btnLbl.textContent = requesting ? t`Leaving...` : t`Leave Server`;
  };

  el.addEventListener(
    "click",
    async (e) => {
      const btn = closestFromEvent(e, "[data-action]");
      if (!btn) return;
      const action = btn.dataset.action!;

      if (action === "close") {
        return ac.abort();
      }
      if (action === "leave") {
        if (requesting) return;
        requesting = true;
        updateButton();

        const [, error] = await leaveServer(serverId);
        requesting = false;
        updateButton();
        if (!error) {
          ac.abort();
        }
        if (error) {
          alert({ message: error.message });
        }
      }
    },
    { signal },
  );

  return createModal(() => {
    return el;
  }, ac);
};
