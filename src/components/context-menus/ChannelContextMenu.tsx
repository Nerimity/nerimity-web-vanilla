import { t } from "@lingui/core/macro";

import { accountStore } from "../../store/accountStore";
import { channelStore } from "../../store/channelStore";
import { ServerMember, serverMemberStore } from "../../store/serverMemberStore";
import { Server } from "../../store/serverStore";
import { NotificationMode } from "../../Types";
import { storeEmitter } from "../../utils/EventEmitter";
import { portalElement } from "../../utils/portal";
import { router } from "../../utils/router";
import { ContextMenu } from "../ui/ContextMenu";
import { Radiobox } from "../ui/radiobox";

import style from "./ChannelContextMenu.module.css";

export const createChannelContextMenuHandler = (opts: {
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
    selector: "[data-channel-id]",
    attr: "channelId",
    shouldSkip: opts.shouldSkip,
    resolveData: (channelId) => {
      const channel = channelStore.channels.get(channelId);

      return {
        channel,
        server: channel?.server,
        member: serverMemberStore.currentMember(channel?.serverId!),
        ...opts.data,
      };
    },
    submenus: [
      {
        id: "notifications",
        render: ({ data, pos }) => (
          <ContextMenu.SubmenuRoot pos={pos}>
            <NotificationsSubmenu channelId={data.channel?.id!} />
          </ContextMenu.SubmenuRoot>
        ),
      },
    ],
    renderMenu: ({ x, y, data, signal }) => {
      const getSubmenuEl = () =>
        portalElement().querySelector(
          `.submenu[data-id="notifications"]`,
        ) as HTMLDivElement;

      const rerenderSubmenu = () => {
        getSubmenuEl()?.replaceChildren(
          <NotificationsSubmenu channelId={data.channel?.id!} />,
        );
      };

      const el = (
        <ChannelContextMenu
          x={x}
          y={y}
          server={data.server!}
          member={data.member!}
        />
      ) as HTMLDivElement;

      storeEmitter.on("noti_settings:update", rerenderSubmenu, signal);

      Radiobox.createHandler({
        onChange: (event) => {
          rerenderSubmenu();

          const id = event.id as "server-sound-mode" | "server-ping-mode";

          const index = event.index;

          accountStore.updateUserNotificationSettings({
            serverId: data.server?.id!,
            channelId: data.channel?.id!,
            ...(id === "server-ping-mode"
              ? { pingMode: index == 0 ? null : index - 1 }
              : { soundMode: index == 0 ? null : index - 1 }),
          });
        },
        signal,
        el: portalElement(),
      });

      return el;
    },
    onAction: (actionId, { id: channelId, data }) => {
      switch (actionId) {
        case "settings":
          router.navigate(
            `/app/servers/${data.server?.id}/settings/channels/${channelId}`,
          );
          break;
        case "leave":
          break;
        case "copy_id":
          navigator.clipboard.writeText(channelId);
          break;
        case "copy_object":
          console.log("Copied Object to clipboard", data);
          navigator.clipboard.writeText(JSON.stringify(data));
          break;
      }
    },
  });
};

const ChannelContextMenu = (props: {
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
        <ContextMenu.RightArrowIcon />
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

const NotificationsSubmenu = (props: { channelId: string }) => {
  return (
    <>
      <div class={style.submenuTitle}>{t`Ping`}</div>

      <Radiobox.Group id="server-ping-mode" class={style.radioGroup}>
        <NotificationItem
          value={null}
          channelId={props.channelId}
          label={t`Initial`}
          type="PING"
        />
        <NotificationItem
          value={NotificationMode.ALL}
          channelId={props.channelId}
          label={t`Everything`}
          type="PING"
        />
        <NotificationItem
          value={NotificationMode.MENTIONS_ONLY}
          channelId={props.channelId}
          label={t`Mentions Only`}
          type="PING"
        />
        <NotificationItem
          value={NotificationMode.MUTE}
          channelId={props.channelId}
          label={t`Mute`}
          type="PING"
        />
      </Radiobox.Group>

      <div class={style.submenuTitle}>{t`Sound`}</div>
      <Radiobox.Group id="server-sound-mode" class={style.radioGroup}>
        <NotificationItem
          value={null}
          channelId={props.channelId}
          label={t`Initial`}
          type="SOUND"
        />
        <NotificationItem
          value={NotificationMode.ALL}
          channelId={props.channelId}
          label={t`Everything`}
          type="SOUND"
        />
        <NotificationItem
          value={NotificationMode.MENTIONS_ONLY}
          channelId={props.channelId}
          label={t`Mentions Only`}
          type="SOUND"
        />
        <NotificationItem
          value={NotificationMode.MUTE}
          channelId={props.channelId}
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

const notificationPingMode = (channelId: string) =>
  accountStore.notificationSettings.get(channelId)?.notificationPingMode ??
  null;

const notificationSoundMode = (channelId: string) =>
  accountStore.notificationSettings.get(channelId)?.notificationSoundMode ??
  null;

const NotificationItem = (props: {
  label: string;
  type: "SOUND" | "PING";
  value: null | NotificationMode;
  channelId: string;
}) => {
  let disabled = false;

  if (props.type === "SOUND") {
    if (
      notificationPingMode(props.channelId) !== null &&
      props.value === null
    ) {
      disabled = true;
    }

    if (
      notificationPingMode(props.channelId) ===
        NotificationMode.MENTIONS_ONLY &&
      props.value === NotificationMode.ALL
    ) {
      disabled = true;
    }

    if (notificationPingMode(props.channelId) === NotificationMode.MUTE) {
      disabled = true;
    }
  }

  const selected =
    props.type === "PING"
      ? props.value === notificationPingMode(props.channelId)
      : props.value === notificationSoundMode(props.channelId);

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
