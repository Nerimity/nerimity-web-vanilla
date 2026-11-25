import { t } from "@lingui/core/macro";
import { matchSorter } from "match-sorter";

import { CdnIcon } from "../../components/cdnIcon";
import { Icon } from "../../components/icon";
import { createEditServerRolesModal } from "../../components/modals/EditServerRolesModal";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { GradientText } from "../../components/ui/gradientText";
import { Input } from "../../components/ui/input";
import { Item } from "../../components/ui/item";
import { createTable, type OrderBy } from "../../components/ui/Table";
import { ServerMember, serverMemberStore } from "../../store/serverMemberStore";
import type { ServerRole } from "../../store/serverRoleStore";
import { serverStore } from "../../store/serverStore";
import type { User } from "../../store/userStore";
import { resolveGradient } from "../../utils/color";
import { formatTimestamp } from "../../utils/date";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { RolePermissionFlag } from "../../utils/RolePermissionFlag";
import { getAppHeader, type RouteContext } from "./AppPage";

import style from "./createServerMembersPane.module.css";

type Filter = "all" | "24_hours" | "muted";

const ITEMS_PER_PAGE = 25;

const createServerMembersPane = ({ content }: RouteContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  let filteredMembers: ServerMember[] = [];
  let currentFilter: Filter = "all";
  let currentPage = 1;
  let query = "";

  let tableOrder: OrderBy = { by: "desc", headerId: "joined" };

  const totalPages = () => Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const pageMembers = () =>
    filteredMembers.slice(
      ITEMS_PER_PAGE * currentPage - ITEMS_PER_PAGE,
      ITEMS_PER_PAGE * currentPage,
    );

  const updateQuery = () => {
    query = query.trim();
    const now = Date.now();
    const serverId = serverStore.currentServerId!;
    filteredMembers = serverMemberStore.membersOf(serverId);

    if (currentFilter !== "all") {
      filteredMembers = filteredMembers.filter((m) => {
        if (currentFilter === "24_hours") {
          if (m?.joinedAt < now - 86400000) return false;
        }

        if (currentFilter === "muted") {
          const muteExpireAt = m?.muteExpireAt;
          if (!muteExpireAt) return false;
          if (muteExpireAt < now) return false;
        }
        return true;
      });
    }

    if (query)
      filteredMembers = matchSorter(filteredMembers, query, {
        keys: ["nickname", (item) => item.user?.username!],
      });

    const direction = tableOrder.by === "asc" ? 1 : -1;

    filteredMembers.sort((a, b) => {
      if (tableOrder.headerId === "member") {
        const au = a.displayName || "";
        const bu = b.displayName || "";
        return au.localeCompare(bu) * direction;
      }
      if (tableOrder.headerId === "joined") {
        return (a.joinedAt - b.joinedAt) * direction;
      }
      if (tableOrder.headerId === "joined_nerimity") {
        return ((a.user?.joinedAt || 0) - (b.user?.joinedAt || 0)) * direction;
      }
      return 0;
    });

    rerender();
  };

  const header = (
    <div class={style.header}>
      <Input placeholder={t`Search`} />
      <div class={style.filters}>
        <Item.Base data-value="all" handlePosition="bottom">
          <Item.Icon name="group" />
          <Item.Label>{t`All`}</Item.Label>
        </Item.Base>
        <Item.Base data-value="24_hours" handlePosition="bottom">
          <Item.Icon name="schedule" />
          <Item.Label>{t`24 Hours`}</Item.Label>
        </Item.Base>
        <Item.Base data-value="muted" handlePosition="bottom">
          <Item.Icon name="volume_off" />
          <Item.Label>{t`Muted`}</Item.Label>
        </Item.Base>
      </div>
    </div>
  ) as HTMLDivElement;

  const table = createTable({
    signal,
    headers: [
      { id: "member", title: t`Member`, orderable: true },
      { id: "joined", title: t`Joined`, orderable: true },
      { id: "joined_nerimity", title: t`Joined Nerimity`, orderable: true },
      { id: "roles", title: t`Roles` },
    ],
    rows() {
      return pageMembers().map((m) => {
        const user = m.user;

        return {
          id: user?.id!,
          row: [
            <MemberCell member={m} user={user!} />,
            formatTimestamp(m.joinedAt),
            formatTimestamp(user?.joinedAt!),
            <RoleCell member={m} />,
          ],
        };
      });
    },
    onOrderChange(event) {
      tableOrder = event;
      updateQuery();
    },
    orderBy() {
      return tableOrder;
    },
  });

  const footer = (<div class={style.footer}></div>) as HTMLDivElement;
  const el = (
    <div class={style.page}>
      {header}
      {table.element}
      {footer}
    </div>
  ) as HTMLDivElement;

  const input = header.querySelector<HTMLInputElement>("input");

  const rerender = () => {
    table.rerender();
    footer.replaceChildren(
      <>
        {currentPage} of {totalPages() || 1}
        <div class={style.buttons}>
          <Button
            data-action="previous"
            label={t`Previous`}
            primary={currentPage !== 1}
          />
          <Button
            data-action="next"
            label={t`Next`}
            primary={currentPage !== totalPages()}
          />
        </div>
      </>,
    );
  };

  el.addEventListener(
    "click",
    (e) => {
      const button = closestFromEvent(e, `[data-action]`);
      if (!button) return;
      const action = button.dataset.action!;
      const active = button.dataset.primary === "true";

      if (action === "edit_role") {
        const row = closestFromEvent(e, `[data-row-id]`);
        const userId = row?.dataset.rowId;
        if (!userId) return;
        createEditServerRolesModal({
          userId,
        });
      }

      const parentEl = content.parentElement!;

      if (action === "previous") {
        if (!active) return;
        currentPage -= 1;
        updateQuery();
        parentEl.scrollTop = 0;
      }
      if (action === "next") {
        if (!active) return;
        currentPage += 1;
        updateQuery();
        parentEl.scrollTop = 0;
      }
    },
    { signal },
  );

  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => state && updateQuery(),
    signal,
  );

  serverStore.currentServerSortedRoles.onUpdate(table.rerender, signal);

  storeEmitter.on(
    "server:member_update",
    (event) => {
      if (event.serverId !== serverStore.currentServerId) return;
      table.rerender();
    },
    signal,
  );

  input?.addEventListener(
    "input",
    () => {
      currentPage = 1;
      query = input.value;
      updateQuery();
    },
    { signal },
  );

  Item.handler<Filter>({
    signal,
    container: header,
    initialTab: "all",
    onChange(value) {
      currentFilter = value;
      updateQuery();
    },
  });

  getAppHeader()?.updateHeader({
    label: t`Members`,
    icon: "group",
  });

  content.replaceChildren(el);

  const destroy = () => {
    ac.abort();
    el.remove();
    getAppHeader()?.updateHeader({ trigger: false });
  };

  return { destroy };
};

const MemberCell = ({ user, member }: { user: User; member: ServerMember }) => {
  const topRoleColor = serverStore.memberTopColor(member);

  const color =
    resolveGradient(topRoleColor?.gradient || topRoleColor?.color) ?? "";
  return (
    <div class={style.memberCell}>
      <Avatar size={28} user={user} />
      <div>
        <GradientText class={style.displayName} color={color}>
          {member.displayName}
        </GradientText>
        <div class={style.username}>
          {user?.username}:<span class={style.dim}>{user?.tag}</span>
        </div>
      </div>
    </div>
  );
};
const RoleCell = ({ member }: { member: ServerMember }) => {
  const serverRoles = serverStore.currentServerSortedRoles.value();

  const roles = serverRoles.filter((role) => member?.roleIds.includes(role.id));

  const server = serverStore.currentServer();
  const selfMember = serverMemberStore.currentMember(server?.id!);

  const isTargetInServer = !!member;
  const isSelfCreator = server?.createdById === selfMember?.userId;
  const selfHasManageRolesPerm = selfMember?.hasPerm(
    RolePermissionFlag.manageRoles.bit,
  );

  const canEditRoles =
    isTargetInServer && (isSelfCreator || selfHasManageRolesPerm);

  return (
    <div class={style.roleCell}>
      {roles.map((r) => (
        <RoleItem role={r} />
      ))}
      {canEditRoles && (
        <div data-action="edit_role" class={[style.roleItem, style.roleAdd]}>
          <Icon name="add" />
        </div>
      )}
    </div>
  );
};

const RoleItem = (props: { role: ServerRole }) => {
  const color = resolveGradient(props.role.gradient || props.role.hexColor);

  return (
    <div class={style.roleItem}>
      {props.role.icon && <CdnIcon size={12} role={props.role} />}
      <GradientText color={color}>{props.role.name}</GradientText>
    </div>
  );
};

export default createServerMembersPane;
