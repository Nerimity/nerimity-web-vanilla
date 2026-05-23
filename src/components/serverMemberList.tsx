import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";

import { h } from "../h";
import { channelStore } from "../store/channelStore";
import { ServerMember, serverMemberStore } from "../store/serverMemberStore";
import { ServerRole, serverRoleStore } from "../store/serverRoleStore";
import { serverStore } from "../store/serverStore";
import { userPresenceStore } from "../store/userPresenceStore";
import { userStore } from "../store/userStore";
import { hasBit } from "../utils/bitwise";
import { ChannelPermissionFlag } from "../utils/channelPermissionFlag";
import { convertShorthandToLinearGradient } from "../utils/color";
import { storeEmitter } from "../utils/EventEmitter";
import { HoverAnimator } from "../utils/HoverAnimator";
import { ManualMemo } from "../utils/memo";
import { RolePermissionFlag } from "../utils/RolePermissionFlag";
import { Avatar } from "./avatar";
import { CdnIcon } from "./cdnIcon";
import { Drawer } from "./drawer";
import { GradientText } from "./gradientText";
import { ServerClanItem } from "./serverClanItem";
import { UserPresence } from "./userPresence";
import { createVirtualList } from "./virtualList";

const CategoryType = {
  role: 0,
  member: 1,
} as const;

type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

type Categorized =
  | { type: 0; role: ServerRole; count: number }
  | { type: 1; member: ServerMember; role: ServerRole };

const offlineRole: ServerRole = new ServerRole({
  name: t`Offline`,
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
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  width: 100%;
  --padding-right: 2px;
  padding-left: 6px;
`;
export const createServerMemberList = () => {
  let containerEl: HTMLDivElement | null = null;
  let hoverAnimator: HoverAnimator | null = null;
  const ac = new AbortController();
  const { signal } = ac;

  const roleOrderMemoized = new ManualMemo(roleOrder);
  const visibleRoleIdsMemoized = new ManualMemo(visibleRoleIds);
  const isDefaultPublicMemoized = new ManualMemo(isDefaultPublic);
  let dontRender = () =>
    (Drawer().currentMode === "mobile" && Drawer().visiblePage !== 2) ||
    (Drawer().currentMode === "desktop" && Drawer().desktopHideRightDrawer);

  let cachedDontRender = dontRender();
  const categorizedMembersMemoized = new ManualMemo((prev) => {
    if (cachedDontRender) return { result: [], userIdToRoleId: {} };
    const result = ((prev as any)?.result || []) as Categorized[];
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

        if (!canViewChannel && vRoleIds.has(roleId)) canViewChannel = true;

        const idx = roleOrder[roleId];
        if (idx !== undefined && idx < bestIndex) {
          bestIndex = idx;
          topRoleId = roleId;
        }

        if (canViewChannel && bestIndex === 0) break;
      }

      if (!canViewChannel) continue;

      if (!presences.has(member.userId)) {
        offlineMembers.push(member);
        continue;
      }

      const targetRoleId = topRoleId ?? defaultRole?.id;
      if (targetRoleId) {
        userIdToRoleId[member.userId] = targetRoleId;
        buckets[targetRoleId]?.push(member);
      }
    }

    let cursor = 0;

    const isSame = (a: Categorized, b: Categorized) =>
      a.type === b.type &&
      (a.type === CategoryType.role
        ? a.role.id === (b as any).role?.id
        : a.member.userId === (b as any).member?.userId &&
          a.role.id === (b as any).role?.id);

    const place = (item: Categorized) => {
      const curr = result[cursor];

      if (curr && isSame(curr, item)) {
        if (
          item.type === CategoryType.role &&
          (curr as any).count !== item.count
        )
          (curr as any).count = item.count;
        cursor++;
        return;
      }

      let found = -1;
      for (let i = cursor + 1; i < result.length; i++) {
        if (isSame(result[i]!, item)) {
          found = i;
          break;
        }
      }

      if (found !== -1) {
        const [existing] = result.splice(found, 1);
        result.splice(cursor, 0, existing!);
        if (
          item.type === CategoryType.role &&
          (result[cursor] as any).count !== item.count
        )
          (result[cursor] as any).count = item.count;
      } else {
        result.splice(cursor, 0, item);
      }

      cursor++;
    };

    for (let i = 0; i < sortedRoles.length; i++) {
      const role = sortedRoles[i]!;
      const bucket = buckets[role.id];
      if (bucket?.length) {
        place({ type: CategoryType.role, role, count: bucket.length });
        for (let j = 0; j < bucket.length; j++)
          place({ type: CategoryType.member, member: bucket[j]!, role });
      }
    }

    if (offlineMembers.length && offlineRole) {
      place({
        type: CategoryType.role,
        role: offlineRole,
        count: offlineMembers.length,
      });
      for (let i = 0; i < offlineMembers.length; i++)
        place({
          type: CategoryType.member,
          member: offlineMembers[i]!,
          role: offlineRole,
        });
    }

    if (result.length > cursor) result.splice(cursor);

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
      id: (i) => (i.type === CategoryType.member ? i.member.userId : i.role.id),
      items: () => categorizedMembersMemoized.value().result,
      type: {
        [CategoryType.role]: { height: 40 },
        [CategoryType.member]: { height: 44 },
      },
      parentEl: containerEl,
      renderItem: memberItem,
    });

    containerEl.replaceChildren(vt.render());
  };

  storeEmitter.on(
    "navigate:channelId",
    () => {
      cachedDontRender = dontRender();
      rerunAndRender(true);
    },
    signal,
  );

  const updateVisibility = () => {
    if (cachedDontRender) {
      cachedDontRender = dontRender();
      categorizedMembersMemoized.rerun();
      renderList();
    }
  };

  storeEmitter.on("drawer:pageVisible", updateVisibility, signal);
  storeEmitter.on("drawer:modeChange", updateVisibility, signal);
  storeEmitter.on("drawer:toggleRightDesktop", updateVisibility, signal);

  serverStore.currentServerSortedRoles.onUpdate(() => {
    rerunAndRender();
  }, signal);

  const rerunAndRender = (rerender?: boolean) => {
    // serverStore.currentServerSortedRoles.rerun();
    roleOrderMemoized.rerun();
    visibleRoleIdsMemoized.rerun();
    isDefaultPublicMemoized.rerun();
    categorizedMembersMemoized.rerun();
    renderList();
    if (rerender) {
      vt?.rerenderItems();
    }
  };

  storeEmitter.on(
    "server:members_fetched",
    ({ serverId }) => {
      if (serverId !== serverStore.currentServerId) return;
      rerunAndRender();
    },
    signal,
  );

  storeEmitter.on(
    "user:presence_update",
    (event) => {
      const oldRoleId =
        categorizedMembersMemoized.value().userIdToRoleId[event.userId] ??
        "offline";
      categorizedMembersMemoized.rerun();
      renderList();
      const newRoleId =
        categorizedMembersMemoized.value().userIdToRoleId[event.userId] ??
        "offline";
      vt?.rerenderItem(event.userId);
      if (oldRoleId) vt?.rerenderItem(oldRoleId);
      if (newRoleId !== oldRoleId) vt?.rerenderItem(newRoleId);
    },
    signal,
  );

  const render = () => {
    containerEl = (
      <div class={[memberListContainer, "scrollbarHover"]}></div>
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
    ac.abort();
    vt?.destroy();
    hoverAnimator?.destroy();

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

  &:hover {
    background-color: var(--gray-800);
    border-radius: var(--radius-8);
  }

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
  .info {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
`;

const roleItemContainer = css`
  display: flex;
  gap: 8px;
  height: 40px;
  margin-left: 10px;
  margin-right: 10px;
  align-items: center;
  .roleName {
    color: var(--text-muted);
    font-size: 14px;
  }
`;
const memberItem = (cat: Categorized) => {
  if (cat.type === CategoryType.member) {
    const user = userStore.users.get(cat.member.userId);
    const topRoleColor = serverStore.memberTopColor(cat.member);

    const color =
      convertShorthandToLinearGradient(topRoleColor) ?? topRoleColor ?? "";

    return (
      <div
        class={memberItemContainer}
        data-user-id={user?.id}
        data-role-id={cat.role.id}
      >
        <Avatar size={32} user={user!} imgClass="avatar" />
        <div class="info">
          <span class="memberInfo">
            <GradientText color={color} class="memberName">
              {cat.member.nickname || user?.username}
            </GradientText>
            {user?.profile?.clan && <ServerClanItem clan={user.profile.clan} />}
          </span>
          <UserPresence userId={cat.member.userId} />
        </div>
      </div>
    );
  } else {
    const role = cat.role;

    return (
      <div class={roleItemContainer} data-role-header-id={role.id}>
        {role.icon ? <CdnIcon role={role} size={14} /> : null}
        <span class="roleName">
          {role?.name} - {cat.count}
        </span>
      </div>
    );
  }
};
