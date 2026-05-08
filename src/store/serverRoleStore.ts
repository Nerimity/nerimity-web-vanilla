import type { RawServerRole } from "../Types";

export const serverRoleStore = createServerRoleStore();

export class ServerRole {
  id: string;
  serverId: string;
  permissions: number;
  order: number;
  name: string;
  hideRole: boolean;
  hexColor?: string;
  constructor(data: RawServerRole) {
    this.id = data.id;
    this.serverId = data.serverId;
    this.permissions = data.permissions;
    this.order = data.order;
    this.name = data.name;
    this.hideRole = data.hideRole;
    this.hexColor = data.hexColor;
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

  return { roles, setRoles };
}
