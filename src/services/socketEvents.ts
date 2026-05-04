import { serverMemberStore } from "../store/serverMemberStore";
import { serverStore } from "../store/serverStore";

export const socketEventHandler = (event: string, payload: any) => {
  if (event === "user:authenticated") {
    onAuthenticated(payload);
  }
  if (event === "server:channel_updated") {
    onServerChannelUpdated(payload);
  }
  if (event === "user:presence_update") {
    onUserPresenceUpdate(payload);
  }
};

const onAuthenticated = (payload: any) => {
  // accountStore.setAuthenticated(true);
  // channelStore.setChannels(payload.channels);
  serverStore.setServers(payload.servers);
  serverMemberStore.setServerMembers(payload.serverMembers);
  // serverRolesStore.setServerRoles(payload.serverRoles);
  // userPresenceStore.setPresences(payload.presences);s
};

const onServerChannelUpdated = (payload: any) => {
  // channelStore.updateChannel(payload.channelId, payload);
};

const onUserPresenceUpdate = (payload: any) => {
  // userPresenceStore.updatePresence(payload.userId, payload);
};
