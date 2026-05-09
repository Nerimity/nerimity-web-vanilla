import { h } from "../h";
import { ServerMember, serverMemberStore } from "../store/serverMemberStore";
import { serverStore } from "../store/serverStore";
import { userStore } from "../store/userStore";
import { storeEmitter } from "../utils/EventEmitter";
import { Avatar } from "./avatar";
import { ServerRole, serverRoleStore } from "../store/serverRoleStore";
import { channelStore } from "../store/channelStore";
import { userPresenceStore } from "../store/userPresenceStore";
import { ChannelPermissionFlag } from "../utils/channelPermissionFlag";
import { hasBit } from "../utils/bitwise";
import { RolePermissionFlag } from "../utils/RolePermissionFlag";
import { ManualMemo } from "../utils/memo";
import { createVirtualList } from "./virtualList";
import { convertShorthandToLinearGradient } from "../utils/color";
import { GradientText } from "./gradientText";
import { css } from "@linaria/core";
import { HoverAnimator } from "../utils/HoverAnimator";
import { CdnIcon } from "./cdnIcon";
import { ServerClanItem } from "./serverClanItem";

type Categorized =
  | { type: "r"; role: ServerRole; count: number; id: string }
  | { type: "m"; member: ServerMember; id: string; role: ServerRole };

const offlineRole: ServerRole = new ServerRole({
  name: "Offline",
  id: "offline",
  permissions: 0,
  hideRole: true,
  order: 0,
  serverId: "",
});

const currentServerDefaultRole = () => {
  const server = serverStore.servers.get(serverStore.currentServerId!);
  const currentServerRoles = serverRoleStore.roles.get(server?.id!);
  return currentServerRoles?.get(server?.defaultRoleId!);
};

const currentPermissions = () => {
  const channel = channelStore.channels.get(channelStore.currentChannelId!);
  if (!channel?.permissions) return {};
  const permissions: Record<string, number> = {};

  for (let i = 0; i < channel.permissions.length; i++) {
    const permission = channel.permissions[i]!;
    permissions[permission.roleId!] = permission.permissions;
  }

  return permissions;
};

const isDefaultPublic = () => {
  const channelPermissions = currentPermissions();
  const defaultRole = currentServerDefaultRole();
  return (
    hasBit(
      channelPermissions[defaultRole?.id!],
      ChannelPermissionFlag.publicChannel.bit,
    ) || hasBit(defaultRole?.permissions, RolePermissionFlag.admin.bit)
  );
};

const visibleRoleIds = () => {
  const channelPermissions = currentPermissions();
  const serverRoles =
    serverRoleStore.roles.get(serverStore.currentServerId!) ||
    new Map<string, ServerRole>();
  const set = new Set<string>();
  for (const roleId of Object.keys(channelPermissions)) {
    if (
      hasBit(
        channelPermissions[roleId],
        ChannelPermissionFlag.publicChannel.bit,
      )
    )
      set.add(roleId);
  }
  for (const [roleId, role] of serverRoles) {
    if (hasBit(role?.permissions, RolePermissionFlag.admin.bit))
      set.add(roleId);
  }
  return set;
};

const roleOrder = () => {
  const sorted = serverStore.currentServerSortedRoles
    .value()
    .filter((r) => !r.hideRole);
  const order: Record<string, number> = {};
  for (let i = 0; i < sorted.length; i++) order[sorted[i]!.id] = i;
  return { sorted, order };
};

const memberListContainer = css`
  display: flex;
  overflow: auto;
  flex-direction: column;
  flex-shrink: 0;
  width: 240px;
  height: 100vh;
`;
export const createServerMemberList = () => {
  let containerEl: HTMLDivElement | null = null;
  let hoverAnimator: HoverAnimator | null = null;
  const roleOrderMemoized = new ManualMemo(roleOrder);
  const visibleRoleIdsMemoized = new ManualMemo(visibleRoleIds);
  const isDefaultPublicMemoized = new ManualMemo(isDefaultPublic);

  const categorizedMembersMemoized = new ManualMemo(() => {
    const userIdToRoleId: Record<string, string | null> = {};

    const members = [
      ...(serverMemberStore.serverMembers
        .get(serverStore.currentServerId!)
        ?.values() || []),
    ].sort((a, b) => {
      const au = a.nickname || userStore.users.get(a.userId)!.username;
      const bu = b.nickname || userStore.users.get(b.userId)!.username;
      return au.localeCompare(bu);
    });
    const server = serverStore.servers.get(serverStore.currentServerId!);
    const creatorId = server?.createdById;

    const { sorted: sortedRoles, order: roleOrder } = roleOrderMemoized.value();

    const vRoleIds = visibleRoleIdsMemoized.value();
    const presences = userPresenceStore.presences;

    const defaultRole = currentServerDefaultRole();
    const isDefaultPublic = isDefaultPublicMemoized.value();

    const buckets: Record<string, ServerMember[]> = {};
    const offlineMembers: ServerMember[] = [];

    for (let i = 0; i < sortedRoles.length; i++)
      buckets[sortedRoles[i]!.id] = [];

    for (let i = 0; i < members.length; i++) {
      const member = members[i]!;
      const isCreator = member.userId === creatorId;
      let canViewChannel = isCreator || isDefaultPublic;

      let topRoleId: string | null = null;
      let bestIndex = Infinity;

      const roleIds = member.roleIds;
      for (let y = 0; y < roleIds.length; y++) {
        const roleId = roleIds[y]!;

        if (!canViewChannel && vRoleIds.has(roleId)) {
          canViewChannel = true;
        }

        const idx = roleOrder[roleId];
        if (idx !== undefined && idx < bestIndex) {
          bestIndex = idx;
          topRoleId = roleId;
        }

        if (canViewChannel && bestIndex === 0) break;
      }

      if (!canViewChannel) continue;

      if (!presences.has(member.userId)) {
        if (!canViewChannel) continue;
        userIdToRoleId[member.userId] = "offline";
        offlineMembers.push(member);
        continue;
      }

      const targetRoleId = topRoleId ?? defaultRole?.id;
      if (targetRoleId) {
        userIdToRoleId[member.userId] = targetRoleId;
        buckets[targetRoleId]?.push(member);
      }
    }

    const result: Categorized[] = [];

    for (let i = 0; i < sortedRoles.length; i++) {
      const role = sortedRoles[i]!;
      const bucket = buckets[role.id];
      if (bucket?.length) {
        result.push({ type: "r", role, count: bucket.length, id: role.id });
        for (let j = 0; j < bucket.length; j++)
          result.push({
            type: "m",
            member: bucket[j]!,
            id: bucket[j]!.id,
            role,
          });
      }
    }
    if (offlineMembers.length && offlineRole) {
      result.push({
        type: "r",
        role: offlineRole,
        count: offlineMembers.length,
        id: offlineRole.id,
      });
      for (let i = 0; i < offlineMembers.length; i++) {
        result.push({
          type: "m",
          member: offlineMembers[i]!,
          id: offlineMembers[i]!.id,
          role: offlineRole,
        });
      }
    }

    return { result, userIdToRoleId };
  });

  let vt: ReturnType<typeof createVirtualList> | null = null;
  const renderList = () => {
    if (!containerEl) return;
    if (vt) {
      vt.updateItems();
      return;
    }
    vt = createVirtualList({
      items: () => categorizedMembersMemoized.value().result,
      type: { r: { height: 40 }, m: { height: 44 } },
      parentEl: containerEl,
      renderItem: memberItem,
    });

    containerEl.replaceChildren(vt.render());
  };

  const channelIdUnsub = storeEmitter.on("navigate:channelId", () => {
    roleOrderMemoized.rerun();
    visibleRoleIdsMemoized.rerun();
    isDefaultPublicMemoized.rerun();
    categorizedMembersMemoized.rerun();

    renderList();
  });

  const authenticatedUnsub = storeEmitter.on("user:authenticated", () => {
    roleOrderMemoized.rerun();
    visibleRoleIdsMemoized.rerun();
    isDefaultPublicMemoized.rerun();
    categorizedMembersMemoized.rerun();
    renderList();
  });

  const presenceUnsub = storeEmitter.on("user:presence_update", (event) => {
    const oldRoleId =
      categorizedMembersMemoized.value().userIdToRoleId[event.userId];
    categorizedMembersMemoized.rerun();
    renderList();
    const newRoleId =
      categorizedMembersMemoized.value().userIdToRoleId[event.userId];
    if (oldRoleId) vt?.rerenderItem(oldRoleId);
    if (newRoleId && newRoleId !== oldRoleId) vt?.rerenderItem(newRoleId);
  });

  const render = () => {
    containerEl = (
      <div class={memberListContainer}></div>
    ) as unknown as HTMLDivElement;

    hoverAnimator = new HoverAnimator(containerEl, [
      { trigger: `.${memberItemContainer}`, image: ".clanIcon img" },
      {
        trigger: `.${memberItemContainer}`,
        image: "img.avatar",
        crossAnimate: {
          attr: "data-role-id",
          targetAttr: "data-role-header-id",
          target: "img",
        },
      },
      { trigger: `.${roleItemContainer}`, image: "img" },
    ]);

    renderList();

    return containerEl;
  };

  const destroy = () => {
    vt?.destroy();
    authenticatedUnsub();
    channelIdUnsub();
    presenceUnsub();
    containerEl?.remove();
    containerEl = null;
  };

  return {
    destroy,
    render,
  };
};

const memberItemContainer = css`
  display: flex;
  overflow: hidden;
  align-items: center;
  flex-shrink: 0;
  height: 44px;
  padding: 6px 6px;
  gap: 8px;

  .memberInfo {
    display: inline-flex;
    gap: 4px;
    overflow: hidden;
    flex: 1;
    align-items: center;
  }

  .memberName {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
  }
`;

const roleItemContainer = css`
  display: flex;
  gap: 8px;
  height: 40px;
  align-items: center;
  .roleName {
    color: var(--text-muted);
    font-size: 14px;
  }
`;
const memberItem = (cat: Categorized) => {
  if (cat.type === "m") {
    const user = userStore.users.get(cat.member.userId);
    const topRoleColor = serverStore.memberTopColor(cat.member);

    const color =
      convertShorthandToLinearGradient(topRoleColor) ?? topRoleColor ?? "";

    return (
      <div
        class={memberItemContainer}
        data-user-id={cat.id}
        data-role-id={cat.role.id}
      >
        <Avatar size={32} user={user!} imgClass="avatar" />
        <span class="memberInfo">
          <GradientText color={color} class="memberName">
            {cat.member.nickname || user?.username}
          </GradientText>
          {user?.profile?.clan && <ServerClanItem clan={user.profile.clan} />}
        </span>
      </div>
    );
  } else {
    const role = cat.role;

    return (
      <div class={roleItemContainer} data-role-header-id={cat.id}>
        {role.icon ? <CdnIcon role={role} size={14} /> : null}
        <span class="roleName">
          {role?.name} - {cat.count}
        </span>
      </div>
    );
  }
};
