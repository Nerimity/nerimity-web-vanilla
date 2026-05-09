import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { serverMemberStore } from "../store/serverMemberStore";
import { serverRoleStore } from "../store/serverRoleStore";
import { serverStore } from "../store/serverStore";
import { userPresenceStore } from "../store/userPresenceStore";
import { decompressObject } from "../utils/zstd";

export const socketEventHandler = (event: string, payload: any) => {
  if (event === "user:authenticated") {
    onAuthenticated(payload);
  }
  // if (event === "server:channel_updated") {
  //   onServerChannelUpdated(payload);
  // }
  if (event === "user:presence_update") {
    onUserPresenceUpdate(payload);
  }
};

const onAuthenticated = (payload: any) => {
  if (payload instanceof ArrayBuffer) {
    payload = decompressObject(new Uint8Array(payload));
  }
  // accountStore.setAuthenticated(true);
  channelStore.setChannels(payload.channels);
  serverStore.setServers(payload.servers);
  serverMemberStore.setServerMembers(payload.serverMembers);
  serverRoleStore.setRoles(payload.serverRoles);
  userPresenceStore.setPresences(payload.presences);
  accountStore.setAuthenticated(true);
};

// const onServerChannelUpdated = (payload: any) => {
//   // channelStore.updateChannel(payload.channelId, payload);
// };

const onUserPresenceUpdate = (payload: any) => {
  userPresenceStore.updatePresence(payload.userId, payload);
};
