import { plural, t } from "@lingui/core/macro";
import type Sortable from "sortablejs";

import { Button } from "../../../components/button";
import { CdnIcon } from "../../../components/cdnIcon";
import { GradientText } from "../../../components/gradientText";
import { Icon } from "../../../components/icon";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  createServerRole,
  updateRoleOrder,
} from "../../../services/serverService";
import {
  serverMemberStore,
  type ServerMember,
} from "../../../store/serverMemberStore";
import {
  serverRoleStore,
  type ServerRole,
} from "../../../store/serverRoleStore";
import { serverStore } from "../../../store/serverStore";
import { hasBit } from "../../../utils/bitwise";
import { resolveGradient } from "../../../utils/color";
import { storeEmitter } from "../../../utils/EventEmitter";
import { HoverAnimator } from "../../../utils/HoverAnimator";
import { lazySortable } from "../../../utils/lazySortable";
import { RolePermissionFlag } from "../../../utils/RolePermissionFlag";
import { router } from "../../../utils/router";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./rolesServerSettingsPage.module.css";

const getStrings = () => ({});

const rolesServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  const getServerId = () => serverStore.currentServerId;

  let el = (<div class={style.page}></div>) as HTMLDivElement;

  let sortable: Sortable | null = null;

  const rerender = async () => {
    const orderedRoles = serverStore.currentServerSortedRoles.rerun();

    const members = [
      ...(serverMemberStore.serverMembers.get(getServerId()!)?.values() || []),
    ];
    el.replaceChildren(
      <SettingsBlock.Group class="group">
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="leaderboard" />
          <SettingsBlock.Details title={t`Create New Role`} />
          <Button data-action="create-role" icon="add" label={t`Create Role`} />
        </SettingsBlock.Root>
        {orderedRoles.map((r) => (
          <RoleItem role={r} members={members} />
        ))}
      </SettingsBlock.Group>,
    );

    sortable?.destroy();
    const Sortable = await lazySortable();
    if (signal.aborted) return;

    sortable = new Sortable(el.querySelector(".group")!, {
      delayOnTouchOnly: true,
      delay: 200,
      touchStartThreshold: 5,
      draggable: ".roleItem",
      filter: ".ignoreDrag",
      onUpdate(event) {
        const children = [...event.target.children].filter((c) =>
          c.classList.contains("roleItem"),
        ) as HTMLDivElement[];
        const newRoleIds = children.map((el) => el.dataset.roleId) as string[];
        updateRoleOrder(getServerId()!, newRoleIds.reverse());
        rerender();
      },
    });
  };

  rerender();

  storeEmitter.on(
    "server:create_role",
    (role) => {
      if (role.serverId !== getServerId()) return;
      rerender();
      navigateToCreatedRole(role.id);
    },
    signal,
  );
  storeEmitter.on(
    "server:update_role",
    (role) => {
      if (role.serverId !== getServerId()) return;
      rerender();
    },
    signal,
  );

  const hoverAnimator = new HoverAnimator(el, [
    { image: "img", trigger: `.roleItem` },
  ]);

  let createdRoleId = "";
  el.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLDivElement;

      const actionEl = target.closest("[data-action]") as HTMLDivElement;
      const action = actionEl?.dataset?.action;
      if (action === "create-role") {
        const [role] = await createServerRole(getServerId()!);
        if (role) {
          createdRoleId = role.id;
          navigateToCreatedRole(role.id);
        }
      }
    },
    { signal },
  );

  const navigateToCreatedRole = (roleId: string) => {
    if (createdRoleId != roleId) return;
    if (signal.aborted) return;
    const role = serverRoleStore.roles.get(getServerId()!)?.has(roleId);
    if (!role) return;
    if (signal.aborted) return;
    router.navigate(`./${roleId}`);
  };

  context.content.replaceChildren(el);

  const destroy = () => {
    sortable?.destroy();

    hoverAnimator.destroy();
    ac.abort();
    el.remove();
    (el as any) = null;
  };

  return { destroy };
};

const RoleItem = (props: { role: ServerRole; members: ServerMember[] }) => {
  const color = resolveGradient(props.role.gradient || props.role.hexColor);

  const server = serverStore.currentServer();
  const isDefaultRole = server?.defaultRoleId === props.role.id;

  const memberCount = isDefaultRole
    ? props.members.length
    : props.members
        .filter((member) => member.roleIds.includes(props.role.id))
        .length.toLocaleString();

  const hasAdmin = hasBit(props.role.permissions, RolePermissionFlag.admin.bit);

  return (
    <SettingsBlock.Root
      class={["roleItem", isDefaultRole && "ignoreDrag"]}
      href={`/app/servers/${props.role.serverId}/settings/roles/${props.role.id}`}
      data-role-id={props.role.id}
    >
      {!props.role.icon && (
        <div
          style={{ background: color || "var(--text-color" }}
          class={style.roleColorBlock}
        />
      )}
      {props.role.icon && <CdnIcon size={28} role={props.role} />}
      <div class={style.roleDetails}>
        <span>
          <GradientText class={style.roleText} color={color}>
            {props.role.name}
          </GradientText>
          {hasAdmin && <Icon name="shield" class={style.adminIndicator} />}
        </span>
        <div class={style.memberCount}>
          {plural(memberCount, {
            0: "No members",
            one: "# member",
            other: "# members",
          })}
        </div>
      </div>
    </SettingsBlock.Root>
  );
};

export { getStrings, rolesServerSettingsPage as create };
