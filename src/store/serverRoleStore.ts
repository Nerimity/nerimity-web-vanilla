import type { RawServerRole } from "../Types";
import { applyIfPresent } from "../utils/applyIfPresent";
import { convertShorthandToLinearGradient } from "../utils/color";
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
  botRole?: boolean;
  applyOnJoin?: boolean;
  gradient?: string;
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
    this.applyOnJoin = data.applyOnJoin;

    if (this.hexColor?.startsWith("lg")) {
      const [converted] = convertShorthandToLinearGradient(this.hexColor);
      if (converted) {
        this.hexColor = converted.colors[0]!;
        this.gradient = converted.gradient;
      }
    }
  }

  update(updated: Partial<RawServerRole>) {
    applyIfPresent(this, updated, "name");
    applyIfPresent(this, updated, "permissions");
    applyIfPresent(this, updated, "order");
    applyIfPresent(this, updated, "hideRole");
    applyIfPresent(this, updated, "icon");
    applyIfPresent(this, updated, "applyOnJoin");
    applyIfPresent(this, updated, "hexColor");
    if (updated.hexColor?.startsWith("lg")) {
      const [converted] = convertShorthandToLinearGradient(updated.hexColor);
      if (converted) {
        this.hexColor = converted.colors[0]!;
        this.gradient = converted.gradient;
      }
    }

    const server = serverStore.servers.get(this.serverId);

    const member = serverMemberStore.getMember(
      this.serverId,
      accountStore.currentUser?.id!,
    );

    const defaultRole = server?.defaultRoleId === this.id;

    const hasRole = defaultRole || member?.roleIds.includes(this.id);

    if (hasRole) {
      channelStore.notificationsMemo.rerun();
      serverStore.notificationsMemo.rerun();
      serverStore.currentChannelsSorted.rerun();
    }
    storeEmitter.emit("server:update_role", {
      hasRole: !!hasRole,
      roleId: this.id,
      serverId: this.serverId,
    });
  }
}

function createServerRoleStore() {
  const roles = new Map<string, Map<string, ServerRole>>();

  const setRoles = (newRoles: RawServerRole[], clear = true) => {
    if (clear) roles.clear();
    for (let i = 0; i < newRoles.length; i++) {
      const role = newRoles[i]!;
      const serverRoles =
        roles.get(role.serverId) || new Map<string, ServerRole>();
      serverRoles.set(role.id, new ServerRole(role));
      roles.set(role.serverId, serverRoles);
    }
  };

  const removeAll = (serverId: string) => {
    roles.delete(serverId);
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

  return { roles, setRoles, deleteRole, removeAll };
}
