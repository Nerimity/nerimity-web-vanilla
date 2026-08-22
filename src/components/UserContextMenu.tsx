import { t } from "@lingui/core/macro";

import { accountStore } from "../store/accountStore";
import { inboxStore } from "../store/inboxStore";
import { messageStore } from "../store/messageStore";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { RolePermissionFlag } from "../utils/RolePermissionFlag";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { createBanMemberModal } from "./BanMemberModal";
import { ContextMenu } from "./ContextMenu";
import { createEditServerRolesModal } from "./EditServerRolesModal";
import { createKickMemberModal } from "./KickMemberModal";

export const createUserContextMenuHandler = (opts: {
  el?: HTMLElement;
  data?: Record<string, any>;
  signal: AbortSignal;
  mode?: "contextmenu" | "click";
}) => {
  ContextMenu.createHandler({
    mode: opts.mode,
    el: opts.el,
    signal: opts.signal,
    selector: "[data-user-id]",
    attr: "userId",
    resolveData: (userId) => ({
      user:
        userStore.users.get(userId) ||
        messageStore.findUserInCurrentMessages(userId),
      member: serverMemberStore.serverMembers
        .get(serverStore.currentServerId!)
        ?.get(userId),
      ...opts.data,
    }),
    renderMenu: ({ id, x, y }) => <UserContextMenu x={x} y={y} userId={id} />,
    onAction: (actionId, { id: userId, data }) => {
      const username =
        messageStore.findUserInCurrentMessages(userId)?.username ?? "";
      switch (actionId) {
        case "view_profile":
          router.navigate("/app/profile/" + data.user?.id);
          break;
        case "copy_id":
          navigator.clipboard.writeText(userId);
          break;
        case "copy_object":
          console.log("Copied Object to clipboard", data);
          navigator.clipboard.writeText(JSON.stringify(data));
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
        case "message": {
          inboxStore.openChannel(userId);
        }
      }
    },
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

  const isSelf = props.userId === accountStore.currentUser?.id;

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
      <ContextMenu.Item id="view_profile">
        {user ? (
          <div style={{ padding: "4px" }}>
            <Avatar user={user} size={18} />
          </div>
        ) : (
          <ContextMenu.Icon name="article_person" />
        )}
        <ContextMenu.Label>{t`View Profile`}</ContextMenu.Label>
      </ContextMenu.Item>
      <ContextMenu.Item id="message">
        <ContextMenu.Icon name={isSelf ? "book" : "mail"} />
        <ContextMenu.Label>{isSelf ? t`Notes` : t`Message`}</ContextMenu.Label>
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
