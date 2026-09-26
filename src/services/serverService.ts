import type { RawBotCommand, RawExploreItem, RawServer } from "../Types";
import { request } from "./request";

export interface UpdateServerOptions {
  name?: string;
  avatarId?: string;
  bannerId?: string;
  defaultChannelId?: string;
  systemChannelId?: string | null;
}

export async function updateServer(
  serverId: string,
  body: UpdateServerOptions,
) {
  return request<any>(`/servers/${serverId}`, {
    method: "POST",
    useToken: true,
    body,
  });
}

export const kickServerMember = async (opts: {
  serverId: string;
  userId: string;
}) => {
  return request(`/servers/${opts.serverId}/members/${opts.userId}/kick`, {
    useToken: true,
    method: "DELETE",
  });
};

export const banServerMember = async (opts: {
  serverId: string;
  userId: string;
  deleteRecentMessages: boolean;
  reason?: string;
}) => {
  return request(`/servers/${opts.serverId}/bans/${opts.userId}`, {
    useToken: true,
    method: "POST",
    params: {
      deleteRecentMessages: opts.deleteRecentMessages,
    },
    body: {
      reason: opts.reason,
    },
  });
};

export const updateServerMember = async (opts: {
  serverId: string;
  userId: string;
  update: {
    roleIds?: string[];
  };
}) => {
  return request(`/servers/${opts.serverId}/members/${opts.userId}`, {
    useToken: true,
    method: "POST",

    body: opts.update,
  });
};

export const getServerCommands = async (serverId: string) => {
  return request<{ commands: RawBotCommand[] }>(
    `/servers/${serverId}/bot-commands`,
    {
      useToken: true,
      method: "GET",
    },
  );
};

export type ServerWithMemberCount = RawServer & { memberCount: number };

export const getServerDetailsByCode = async (code: string) => {
  return request<ServerWithMemberCount>(`/servers/invites/${code}`, {
    useToken: true,
    method: "GET",
  });
};
export const getServerDetailsByEmojiId = async (emojiId: string) => {
  return request<RawExploreItem>(`/emojis/${emojiId}/server`, {
    useToken: true,
    method: "GET",
  });
};
export const deleteServer = async (serverId: string) => {
  return request<RawExploreItem>(`/servers/${serverId}`, {
    useToken: true,
    method: "DELETE",
  });
};
export const leaveServer = async (serverId: string) => {
  return request(`/servers/${serverId}/leave`, {
    useToken: true,
    method: "POST",
  });
};
export const joinServerByInviteCode = async (inviteCode: string) => {
  return request(`/servers/invites/${inviteCode}`, {
    useToken: true,
    method: "POST",
  });
};
export const joinPublicServer = async (serverId: string) => {
  return request(`/explore/servers/${serverId}/join`, {
    useToken: true,
    method: "POST",
  });
};
