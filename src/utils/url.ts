export const safeDecodeURIComponent = (val: string) => {
  try {
    return decodeURIComponent(val);
  } catch {
    console.error("could not decode", val);
    return "Decode Fail " + val;
  }
};

export const getFilenameFromPath = (path: string | undefined): string =>
  path?.split("/").at(-1)!;

export const addHttps = (url: string) => {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

export const getMessageLink = (opts: {
  channelId: string;
  messageId: string;
  serverId?: string;
}) => {
  const channelPath = opts.serverId
    ? `/app/servers/${opts.serverId}/${opts.channelId}`
    : `/app/inbox/${opts.channelId}`;

  return `${channelPath}?messageId=${opts.messageId}`;
};
