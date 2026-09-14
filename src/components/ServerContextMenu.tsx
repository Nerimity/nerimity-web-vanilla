import { t } from "@lingui/core/macro";

import { ServerMember, serverMemberStore } from "../store/serverMemberStore";
import { Server, serverStore } from "../store/serverStore";
import { router } from "../utils/router";
import { ContextMenu } from "./ContextMenu";

export const createServerContextMenuHandler = (opts: {
  el?: HTMLElement;
  data?: Record<string, any>;
  signal: AbortSignal;
  mode?: "contextmenu" | "click";
}) => {
  ContextMenu.createHandler({
    mode: opts.mode,
    el: opts.el,
    signal: opts.signal,
    selector: "[data-server-id]",
    attr: "serverId",
    resolveData: (serverId) => ({
      server: serverStore.servers.get(serverId),
      member: serverMemberStore.currentMember(serverId),
      ...opts.data,
    }),
    renderMenu: ({ x, y, data }) => (
      <ServerContextMenu
        x={x}
        y={y}
        server={data.server!}
        member={data.member!}
      />
    ),
    onAction: (actionId, { id: serverId, data }) => {
      switch (actionId) {
        case "settings":
          router.navigate(`/app/servers/${serverId}/settings`);
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
