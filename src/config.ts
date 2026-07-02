export const wsUrl = "wss://nerimity.com/socket.io/?EIO=4&transport=websocket";
export const apiUrl = "https://nerimity.com/api";
export const cdnUrl = "https://cdn.nerimity.com/";
export const emojiUrl = "https://nerimity.com/twemojis/";
export const mobileWidth = 800;

export const isMobileWidth = () => {
  return window.innerWidth < mobileWidth;
};
