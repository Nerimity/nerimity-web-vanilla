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
