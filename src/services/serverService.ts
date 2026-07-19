import type { RawBotCommand } from "../Types";
import { request } from "./request";

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
