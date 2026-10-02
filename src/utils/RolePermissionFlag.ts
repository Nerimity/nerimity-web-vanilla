import { t } from "@lingui/core/macro";

export const RolePermissionFlag = {
  admin: {
    name: () => t`Admin`,
    icon: "shield",
    bit: 1 << 0,
    description: () => t`Enables all permissions.`,
  },
  sendMessage: {
    name: () => t`Send Message`,
    icon: "chat",
    bit: 1 << 1,
    description: () =>
      t`Enable sending messages in this server. Server admins can still send messages.`,
  },
  manageRoles: {
    name: () => t`Manage Roles`,
    icon: "manage_accounts",
    bit: 1 << 2,
    description: () => t`Permission for updating or deleting roles.`,
  },
  manageChannels: {
    name: () => t`Manage Channels`,
    icon: "dns",
    bit: 1 << 3,
    description: () => t`Permission for updating or deleting channels.`,
  },
  kickMembers: {
    name: () => t`Kick Members`,
    icon: "person_remove",
    bit: 1 << 4,
    description: () => t`Permission to kick users.`,
  },
  banMembers: {
    name: () => t`Ban Members`,
    icon: "block",
    bit: 1 << 5,
    description: () => t`Permission to ban users.`,
  },
  mentionEveryone: {
    name: () => t`Mention Everyone`,
    icon: "alternate_email",
    bit: 1 << 6,
    description: () =>
      t`Enable mentioning @everyone. Server admins can still mention everyone.`,
  },
  nicknameMembers: {
    name: () => t`Nickname Members`,
    icon: "badge",
    bit: 1 << 7,
    description: () => t`Allow users to change their nickname in the server.`,
  },
  mentionRoles: {
    name: () => t`Mention Roles`,
    icon: "alternate_email",
    bit: 1 << 8,
    description: () => t`Allow users to mention roles.`,
  },
};
