import type { RawServerRole } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { accountStore } from "./accountStore";
import { channelStore } from "./channelStore";
import { serverMemberStore } from "./serverMemberStore";
import { serverStore } from "./serverStore";

export const serverRoleStore = createServerRoleStore();

export class ServerRole {
  id: string;
  serverId: string;
  permissions: number;
  order: number;
  name: string;
  hideRole: boolean;
  hexColor?: string;
  icon?: string;
  constructor(data: RawServerRole) {
    this.id = data.id;
    this.serverId = data.serverId;
    this.permissions = data.permissions;
    this.order = data.order;
    this.name = data.name;
    this.hideRole = data.hideRole;
    this.hexColor = data.hexColor;
    this.icon = data.icon;
  }
}

function createServerRoleStore() {
  const roles = new Map<string, Map<string, ServerRole>>();

  const setRoles = (newMembers: RawServerRole[]) => {
    roles.clear();
    for (let i = 0; i < newMembers.length; i++) {
      const role = newMembers[i]!;
      const serverRoles =
        roles.get(role.serverId) || new Map<string, ServerRole>();
      serverRoles.set(role.id, new ServerRole(role));
      roles.set(role.serverId, serverRoles);
    }
  };

  const updateRole = (
    serverId: string,
    roleId: string,
    data: Partial<ServerRole>,
  ) => {
    const server = serverStore.servers.get(serverId);
    const serverRoles = roles.get(serverId);
    if (!serverRoles) return;

    const role = serverRoles.get(roleId);
    if (!role) return;

    const member = serverMemberStore.getMember(
      serverId,
      accountStore.currentUser?.id!,
    );

    const defaultRole = server?.defaultRoleId === roleId;

    const hasRole = defaultRole || member?.roleIds.includes(roleId);

    const newRole = new ServerRole({
      id: role.id,
      serverId: role.serverId,
      permissions: data.permissions ?? role.permissions,
      order: data.order ?? role.order,
      name: data.name ?? role.name,
      hideRole: data.hideRole ?? role.hideRole,
      hexColor: data.hexColor ?? role.hexColor,
      icon: data.icon ?? role.icon,
    });

    serverRoles.set(roleId, newRole);
    if (hasRole) {
      channelStore.notificationsMemo.rerun();
      serverStore.notificationsMemo.rerun();
      serverStore.currentChannelsSorted.rerun();
    }
    storeEmitter.emit("server:update_role", {
      hasRole: !!hasRole,
      roleId,
      serverId,
    });
  };

  return { roles, setRoles, updateRole };
}
