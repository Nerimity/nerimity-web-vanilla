import { plural, t } from "@lingui/core/macro";
import morphdom from "morphdom";

import { h } from "../../h";
import { ServerMember, serverMemberStore } from "../../store/serverMemberStore";
import type { ServerRole } from "../../store/serverRoleStore";
import { serverStore } from "../../store/serverStore";
import { userStore } from "../../store/userStore";
import { resolveGradient } from "../../utils/color";
import { CdnIcon } from "../cdnIcon";
import { Checkbox } from "../checkbox";
import { GradientText } from "../gradientText";
import { createModal, Modal } from "../modal";

import style from "./EditServerRolesModal.module.css";

export const createEditServerRolesModal = (props: {
  userId: string;
  username?: string;
}) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const user = userStore.users.get(props.userId)!;
  const username = props.username || user.username;

  const rolesEl = (<div class={style.roles}></div>) as HTMLDivElement;
  const body = (
    <Modal.Body width="400px">{rolesEl}</Modal.Body>
  ) as HTMLDivElement;

  const members = serverMemberStore.serverMembers.get(
    serverStore.currentServerId!,
  );

  const membersArray = members ? [...members.values()] : [];

  const renderRoles = () => {
    const roles = serverStore.currentServerSortedRoles.value();

    morphdom(
      rolesEl,
      <div>
        {roles.map((role) => (
          <RoleItem userId={props.userId} members={membersArray} role={role} />
        ))}
      </div>,
      { childrenOnly: true },
    );
  };
  renderRoles();

  const modal = (
    <Modal.Root>
      <Modal.Header label={t`Edit Roles - ${username}`} icon="bar_chart" />
      {body}
    </Modal.Root>
  ) as HTMLDivElement;

  modal.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".button") as HTMLElement | null;
      const action = button?.dataset.action;

      if (action === "close") {
        abortController.abort();
      }
    },
    { signal },
  );

  createModal(() => {
    return modal;
  }, abortController);
};

const RoleItem = (props: {
  userId: string;
  role: ServerRole;
  members: ServerMember[];
}) => {
  const color = resolveGradient(props.role.hexColor);

  const server = serverStore.servers.get(serverStore.currentServerId!);
  const isDefaultRole = server?.defaultRoleId === props.role.id;

  const memberCount = isDefaultRole
    ? props.members.length
    : props.members
        .filter((member) => member.roleIds.includes(props.role.id))
        .length.toLocaleString();

  const member = serverMemberStore.getMember(
    serverStore.currentServerId!,
    props.userId,
  );
  const hasRole = isDefaultRole
    ? true
    : member?.roleIds.includes(props.role.id);

  return (
    <div
      data-default={isDefaultRole}
      class={style.roleItem}
      data-selected={hasRole}
    >
      {props.role.icon ? (
        <CdnIcon role={props.role} size={24} animate />
      ) : (
        <div class={style.noIcon} style={{ background: color }} />
      )}
      <div class={style.details}>
        <GradientText color={color} class={style.roleName}>
          {props.role.name}
        </GradientText>
        <div class={style.memberCount}>
          {plural(memberCount, {
            0: "No members",
            one: "# member",
            other: "# members",
          })}
        </div>
      </div>
      <Checkbox.Root checked={hasRole}>
        <Checkbox.Box />
      </Checkbox.Root>
    </div>
  );
};
