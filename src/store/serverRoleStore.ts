import type { RawServerRole } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { patchProperty } from "../utils/object";
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
  botRole?: boolean;
  constructor(data: RawServerRole) {
    this.id = data.id;
    this.serverId = data.serverId;
    this.permissions = data.permissions;
    this.order = data.order;
    this.name = data.name;
    this.hideRole = data.hideRole;
    this.hexColor = data.hexColor;
    this.icon = data.icon;
    this.botRole = data.botRole;
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

    patchProperty(role, data, "permissions");
    patchProperty(role, data, "order");
    patchProperty(role, data, "name");
    patchProperty(role, data, "hideRole");
    patchProperty(role, data, "hexColor");
    patchProperty(role, data, "icon");

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

  const deleteRole = (serverId: string, roleId: string) => {
    const serverRoles = roles.get(serverId);
    if (!serverRoles) return;

    const member = serverMemberStore.getMember(
      serverId,
      accountStore.currentUser?.id!,
    );

    const hasRole = member?.roleIds.includes(roleId);
    serverRoles.delete(roleId);
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

  return { roles, setRoles, updateRole, deleteRole };
}
