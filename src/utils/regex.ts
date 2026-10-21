export const inviteLinkRegex = new RegExp(
  `(?<!<)${"https://nerimity.com"}/i/([^\\s\\[\\]()<>]+?)(?=->|[\\s\\[\\]()<>]|$)`,
);

export const youtubeLinkRegex =
  /(youtu.*be.*)\/(watch\?v=|embed\/|v|shorts|)(.*?((?=[&#?])|$))/;

export const twitterStatusLinkRegex =
  /https:\/\/(www.)?(twitter|x)\.com(\/[a-zA-Z0-9_]+\/status\/[0-9]+)/;
