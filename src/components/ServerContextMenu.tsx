import { t } from "@lingui/core/macro";

import { leaveServer } from "../services/serverService";
import { ServerMember, serverMemberStore } from "../store/serverMemberStore";
import { Server, serverStore } from "../store/serverStore";
import { router } from "../utils/router";
import { Button } from "./button";
import { ContextMenu } from "./ContextMenu";
import { alert, createModal, Modal } from "./modal";

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
      const target = e.target as HTMLDivElement;
      const btn = target.closest("[data-action]") as HTMLDivElement;
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
          if (serverStore.currentServerId === serverId) router.navigate("/app");
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
