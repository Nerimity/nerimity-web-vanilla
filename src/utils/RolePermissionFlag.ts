export const RolePermissionFlag = {
  admin: {
    bit: 1 << 0,
  },
  sendMessage: {
    bit: 1 << 1,
  },
  manageRoles: {
    bit: 1 << 2,
  },
  manageChannels: {
    bit: 1 << 3,
  },
  kickMembers: {
    bit: 1 << 4,
  },
  banMembers: {
    bit: 1 << 5,
  },
  mentionEveryone: {
    bit: 1 << 6,
  },
  nicknameMembers: {
    bit: 1 << 7,
  },
  mentionRoles: {
    bit: 1 << 8,
  },
};
