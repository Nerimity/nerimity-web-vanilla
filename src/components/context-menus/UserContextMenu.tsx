import { t } from "@lingui/core/macro";

import { updateMemberProfile } from "../../services/serverService";
import { unblockUser } from "../../services/userService";
import { accountStore } from "../../store/accountStore";
import { friendStore } from "../../store/friendStore";
import { inboxStore } from "../../store/inboxStore";
import { messageStore } from "../../store/messageStore";
import { ServerMember, serverMemberStore } from "../../store/serverMemberStore";
import { serverStore } from "../../store/serverStore";
import { userStore } from "../../store/userStore";
import { FriendStatus } from "../../Types";
import { closestFromEvent } from "../../utils/dom";
import { RolePermissionFlag } from "../../utils/RolePermissionFlag";
import { router } from "../../utils/router";
import { createBanMemberModal } from "../modals/BanMemberModal";
import { createBlockUserModal } from "../modals/BlockUserModal";
import { createEditServerRolesModal } from "../modals/EditServerRolesModal";
import { createKickMemberModal } from "../modals/KickMemberModal";
import {
  createMuteMemberModal,
  createUnmuteMemberModal,
} from "../modals/MuteMemberModal";
import { Notice } from "../Notice";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { ContextMenu } from "../ui/ContextMenu";
import { Input } from "../ui/input";
import { alert, createModal, Modal } from "../ui/modal";

import style from "./UserContextMenu.module.css";

export const createUserContextMenuHandler = (opts: {
  el?: HTMLElement;
  data?: Record<string, any>;
  signal: AbortSignal;
  mode?: "contextmenu" | "click" | "manual";
}) => {
  return ContextMenu.createHandler({
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
    onAction: async (actionId, { id: userId, data }) => {
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
        case "copy_profile_url":
          const profileUrl = `${location.origin}/app/profile/${data.user?.id}`;
          console.log("Copied to clipboard", profileUrl);
          navigator.clipboard.writeText(profileUrl);
          break;
        case "kick":
          createKickMemberModal({ userId });
          break;
        case "ban":
          createBanMemberModal({ userId, username });
          break;
        case "mute":
          createMuteMemberModal({ userId, username });
          break;
        case "unmute":
          createUnmuteMemberModal({ userId, username });
          break;
        case "edit_roles":
          createEditServerRolesModal({ userId, username });
          break;
        case "block":
          const blocked =
            friendStore.friends.get(userId)?.status === FriendStatus.BLOCKED;
          if (blocked) {
            const [, error] = await unblockUser(userId);
            if (error) {
              alert({ message: error.message });
            }
            return;
          }
          createBlockUserModal({ userId, username });
          break;
        case "message":
          inboxStore.openChannel(userId);
          break;

        case "nickname":
          createServerNicknameModal({ member: data.member! });
          break;
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

  const selfHasAdminPerm = selfMember?.hasPerm(ADMIN_BIT);
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

  const canMute =
    isTargetInServer &&
    !isSelf &&
    !targetIsCreator &&
    (isSelfCreator || selfHasAdminPerm);

  const canEditRoles =
    isTargetInServer && (isSelfCreator || selfHasManageRolesPerm);

  const canNickname = (() => {
    const isAdmin = isSelfCreator || selfHasAdminPerm;
    const result = isSelf || isAdmin;
    return result;
  })();

  const muted =
    targetMember?.muteExpireAt && targetMember.muteExpireAt! > Date.now();

  const blocked =
    friendStore.friends.get(props.userId)?.status === FriendStatus.BLOCKED;

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
      {canNickname && (
        <ContextMenu.Item id="nickname">
          <ContextMenu.Icon name="edit" />
          <ContextMenu.Label>{t`Nickname`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      {!isSelf && (
        <ContextMenu.Item id="block" alert={!blocked}>
          <ContextMenu.Icon name="block" />
          <ContextMenu.Label>
            {blocked ? t`Unblock` : t`Block`}
          </ContextMenu.Label>
        </ContextMenu.Item>
      )}
      <ContextMenu.Separator />
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
          <ContextMenu.Label>{t`Ban`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      {canKick && (
        <ContextMenu.Item id="kick" alert>
          <ContextMenu.Icon name="logout" />
          <ContextMenu.Label>{t`Kick`}</ContextMenu.Label>
        </ContextMenu.Item>
      )}
      {canMute && (
        <>
          {muted ? (
            <ContextMenu.Item id="unmute" alert>
              <ContextMenu.Icon name="volume_up" />
              <ContextMenu.Label>{t`Unmute`}</ContextMenu.Label>
            </ContextMenu.Item>
          ) : (
            <ContextMenu.Item id="mute" alert>
              <ContextMenu.Icon name="volume_off" />
              <ContextMenu.Label>{t`Mute`}</ContextMenu.Label>
            </ContextMenu.Item>
          )}
        </>
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
      <ContextMenu.Item id="copy_profile_url">
        <ContextMenu.Icon name="content_copy" />
        <ContextMenu.Label>{t`Copy Profile URL`}</ContextMenu.Label>
      </ContextMenu.Item>
    </ContextMenu.Root>
  );
};

const createServerNicknameModal = (props: { member: ServerMember }) => {
  const ac = new AbortController();
  const { signal } = ac;

  const modal = (
    <Modal.Root>
      <Modal.Header label={t`Nickname`} icon="edit" />
      <Modal.Body class={style.nicknameModalBody}>
        <Notice
          type="info"
          description={t`Everyone in this server will see this nickname.`}
        />
        <Input placeholder={t`Nickname`} value={props.member.nickname} />
      </Modal.Body>
      <Modal.Footer>
        <Button
          data-action="close"
          label={t`Don't nickname`}
          icon="close"
          hoverBorder
        />
        <Button
          data-action="nickname"
          label={t`Nickname`}
          icon="edit"
          primary
        />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  let requesting = false;

  modal.addEventListener(
    "click",
    async (e) => {
      if (closestFromEvent(e, `[data-action="close"]`)) return ac.abort();
      if (closestFromEvent(e, `[data-action="nickname"]`)) {
        if (requesting) return;

        const labelEl = modal.querySelector(`[data-action="nickname"] .label`);
        const inputEl = modal.querySelector<HTMLInputElement>(`input`);

        if (!labelEl) return;
        if (!inputEl) return;

        requesting = true;
        labelEl.textContent = t`Nicknaming...`;

        const value = inputEl.value;

        const [, err] = await updateMemberProfile(
          props.member.serverId,
          props.member.userId,
          {
            nickname: value.trim() || null,
          },
        );
        requesting = false;
        labelEl.textContent = t`Nickname`;
        if (err) {
          alert({ message: err.message });
          return;
        }
        ac.abort();
      }
    },
    { signal },
  );

  createModal(() => modal, ac);
};
