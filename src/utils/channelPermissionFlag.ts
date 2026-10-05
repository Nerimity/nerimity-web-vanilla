import { t } from "@lingui/core/macro";

export const ChannelPermissionFlag = {
  publicChannel: {
    name: () => t`Public Channel`,
    description: () =>
      t`Enable access to the channel. Server admins can access any channel.`,
    icon: "public",
    bit: 1 << 0,
  },
  sendMessage: {
    name: () => t`Send Message`,
    description: () =>
      t`Enable sending messages in the channel. Server admins can still send messages.`,
    icon: "send",
    bit: 1 << 1,
  },
  joinVoice: {
    name: () => t`Join Voice`,
    description: () =>
      t`Enable joining voice channels in the channel. Server admins can still join voice channels.`,
    icon: "call",
    bit: 1 << 2,
  },
};
