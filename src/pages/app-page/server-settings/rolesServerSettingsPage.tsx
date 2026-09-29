import { plural, t } from "@lingui/core/macro";

import { Button } from "../../../components/button";
import { CdnIcon } from "../../../components/cdnIcon";
import { GradientText } from "../../../components/gradientText";
import { SettingsBlock } from "../../../components/SettingsBlock";
import {
  serverMemberStore,
  type ServerMember,
} from "../../../store/serverMemberStore";
import type { ServerRole } from "../../../store/serverRoleStore";
import { serverStore } from "../../../store/serverStore";
import { resolveGradient } from "../../../utils/color";
import { HoverAnimator } from "../../../utils/HoverAnimator";
import type { ServerSettingsContext } from "./ServerSettings";

import style from "./rolesServerSettingsPage.module.css";

const getStrings = () => ({});

const rolesServerSettingsPage = (context: ServerSettingsContext) => {
  const ac = new AbortController();
  // const { signal } = ac;

  const getServerId = () => serverStore.currentServerId;

  const orderedRoles = serverStore.currentServerSortedRoles.rerun();

  const members = [
    ...(serverMemberStore.serverMembers.get(getServerId()!)?.values() || []),
  ];

  let el = (
    <div class={style.page}>
      <SettingsBlock.Group>
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="leaderboard" />
          <SettingsBlock.Details title={t`Create New Role`} />
          <Button icon="add" label={t`Create Role`} />
        </SettingsBlock.Root>
        {orderedRoles.map((r) => (
          <RoleItem role={r} members={members} />
        ))}
      </SettingsBlock.Group>
    </div>
  ) as HTMLDivElement;

  const hoverAnimator = new HoverAnimator(el, [
    { image: "img", trigger: `.roleItem` },
  ]);

  context.content.replaceChildren(el);

  const destroy = () => {
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

  return (
    <SettingsBlock.Root
      class="roleItem"
      href={`/app/servers/${props.role.serverId}/settings/roles/${props.role.id}`}
    >
      {!props.role.icon && (
        <div
          style={{ background: color || "var(--text-color" }}
          class={style.roleColorBlock}
        />
      )}
      {props.role.icon && <CdnIcon size={28} role={props.role} />}
      <div class={style.roleDetails}>
        <GradientText class={style.roleText} color={color}>
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
    </SettingsBlock.Root>
  );
};

export { getStrings, rolesServerSettingsPage as create };
