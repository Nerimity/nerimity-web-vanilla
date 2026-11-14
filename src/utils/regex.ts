export const inviteLinkRegex = new RegExp(
  `(?<!<)${"https://nerimity.com"}/i/([^\\s\\[\\]()<>]+?)(?=->|[\\s\\[\\]()<>]|$)`,
);

export const YoutubeLinkRegex =
  /(youtu.*be.*)\/(watch\?v=|embed\/|v|shorts|)(.*?((?=[&#?])|$))(?:.*?[?&#]t=([^&#]*))?/;

export const TweetLinkRegex =
  /https:\/\/(www.)?(twitter|x)\.com(\/[a-zA-Z0-9_]+\/status\/[0-9]+)/;
