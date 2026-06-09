import { serverStore } from "../store/serverStore";
import { storeEmitter } from "./EventEmitter";
import { getLocalItem, setLocalItem } from "./localStorage";

export const setRecentServerChannel = (serverId: string, channelId: string) => {
  let recentServerChannels = getLocalItem("recentServerChannels", [])!;

  recentServerChannels = recentServerChannels?.filter(
    (item) => item[0] !== serverId,
  );

  const isAlreadyDefault =
    serverStore.servers.get(serverId)?.defaultChannelId === channelId;

  if (!isAlreadyDefault) {
    recentServerChannels.push([serverId, channelId]);
    recentServerChannels = recentServerChannels.slice(-20);
  }

  setLocalItem("recentServerChannels", recentServerChannels);
  storeEmitter.emit("recent_server_update", {
    serverId,
    channelId,
  });
};

export const getRecentServerChannelId = (serverId: string) => {
  const defaultChannelId = serverStore.servers.get(serverId)?.defaultChannelId;

  const recentServerChannels = getLocalItem("recentServerChannels", [])!;
  return (
    recentServerChannels.find((item) => item[0] === serverId)?.[1] ||
    defaultChannelId
  );
};
