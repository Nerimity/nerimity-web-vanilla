import { t } from "@lingui/core/macro";

import { h } from "../h";
import { messageStore } from "../store/messageStore";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { portalElement } from "../utils/portal";
import { RolePermissionFlag } from "../utils/RolePermissionFlag";
import { Avatar } from "./avatar";
import { createBanMemberModal } from "./message-pane/BanMemberModal";
import { ContextMenu } from "./message-pane/ContextMenu";
import { createEditServerRolesModal } from "./message-pane/EditServerRolesModal";
import { createKickMemberModal } from "./message-pane/KickMemberModal";
import { createModal } from "./modal";

export const createUserContextMenuHandler = (opts: { signal: AbortSignal }) => {
  document.body.addEventListener("contextmenu", (event) => {
    const target = event.target as HTMLElement;
    const userEl = target.closest(`[data-user-id]`) as HTMLElement;
    if (!userEl) return;
    const userId = userEl.dataset?.userId!;

    const abortController = new AbortController();

    if (!userId) return;
    event.stopPropagation();
    event.preventDefault();

    const user =
      userStore.users.get(userId) ||
      messageStore.findUserInCurrentMessages(userId);
    const member = serverMemberStore.serverMembers
      .get(serverStore.currentServerId!)
      ?.get(userId);

    const username =
      messageStore.findUserInCurrentMessages(userId)?.username ?? "";

    portalElement().addEventListener(
      "click",
      (event) => {
        abortController.abort();
        const target = event.target as HTMLElement;
        const item = target.closest(".ctx-item");
        const id = item?.id;
        switch (id) {
          case "copy_id":
            navigator.clipboard.writeText(userId);
            break;
          case "copy_object":
            console.log("Copied user object to clipboard:", { user, member });
            navigator.clipboard.writeText(JSON.stringify({ user, member }));
            break;
          case "kick":
            createKickMemberModal({ userId });
            break;
          case "ban":
            createBanMemberModal({ userId, username });
            break;
          case "edit_roles":
            createEditServerRolesModal({ userId, username });
            break;

          default:
            break;
        }
      },
      { signal: abortController.signal },
    );

    createModal(
      () => (
        <UserContextMenu
          x={`${event.clientX}px`}
          y={`${event.clientY}px`}
          userId={userId}
        />
      ),
      abortController,
    );
    opts.signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });
  });
};

const UserContextMenu = (props: { x: string; y: string; userId: string }) => {
  const BAN_BIT = RolePermissionFlag.banMembers.bit;
  const KICK_BIT = RolePermissionFlag.kickMembers.bit;
  const ADMIN_BIT = RolePermissionFlag.admin.bit;
  const MANAGE_ROLES_BIT = RolePermissionFlag.manageRoles.bit;

  const server = serverStore.currentServer();

  const user =
    userStore.users.get(props.userId) ||
    messageStore.findUserInCurrentMessages(props.userId);

  const targetMember = serverMemberStore.serverMembers
    .get(server?.id!)
    ?.get(props.userId);
  const isTargetInServer = !!targetMember;
  const selfMember = serverMemberStore.currentMember(server?.id!);

  const isSelf = props.userId === selfMember?.userId;

  const isSelfCreator = server?.createdById === selfMember?.userId;
  const targetIsCreator = server?.createdById === targetMember?.userId;

  const targetIsAdmin = targetMember?.hasPerm(ADMIN_BIT);
  const selfHasBanPerm = selfMember?.hasPerm(BAN_BIT);

  const selfHasKickPerm = selfMember?.hasPerm(KICK_BIT);
  const selfHasManageRolesPerm = selfMember?.hasPerm(MANAGE_ROLES_BIT);

  const canBan =
    !isSelf &&
    !targetIsCreator &&
    (isSelfCreator || (selfHasBanPerm && !targetIsAdmin));

  const canKick =
    isTargetInServer &&
    !isSelf &&
    !targetIsCreator &&
    (isSelfCreator || (selfHasKickPerm && !targetIsAdmin));

  const canEditRoles =
    isTargetInServer && (isSelfCreator || selfHasManageRolesPerm);

  return (
    <ContextMenu.Root pos={{ x: props.x, y: props.y }} id="user-ctx">
      <ContextMenu.Item id="edit">
        {user ? (
          <div style={{ padding: "4px" }}>
            <Avatar user={user} size={18} />
          </div>
        ) : (
          <ContextMenu.Icon name="edit" />
        )}
        <ContextMenu.Label>{t`View Profile`}</ContextMenu.Label>
      </ContextMenu.Item>
      {canEditRoles && (
        <ContextMenu.Item id="edit_roles">
          <ContextMenu.Icon name="bar_chart" />
          <ContextMenu.Label>{t`Edit Roles`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      <ContextMenu.Separator />
      {canBan && (
        <ContextMenu.Item id="ban" alert>
          <ContextMenu.Icon name="block" />
          <ContextMenu.Label>{t`Ban Member`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      {canKick && (
        <ContextMenu.Item id="kick" alert>
          <ContextMenu.Icon name="logout" />
          <ContextMenu.Label>{t`Kick Member`}</ContextMenu.Label>
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
