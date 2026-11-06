import type { RawServer, RawUser } from "../Types";
import { request } from "./request";

export interface GetApplicationBotResponse {
  bot: RawUser & {
    application: {
      creatorAccount: { user: RawUser };
    };
  };
  servers: RawServer[];
}

export const getApplicationBot = async (opts?: {
  appId: string;
  includeServers?: boolean;
}) => {
  return request<GetApplicationBotResponse>(
    `/applications/${opts?.appId}/bot`,
    {
      useToken: true,
      method: "GET",
      params: {
        includeServers: opts?.includeServers,
      },
    },
  );
};
