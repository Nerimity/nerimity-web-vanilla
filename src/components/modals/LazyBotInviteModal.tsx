import type { BotInviteModalOpts } from "./BotInviteModal";

export const createBotInviteModalLazy = async (opts: BotInviteModalOpts) => {
  const { _createBotInviteModal } = await import("./BotInviteModal");
  _createBotInviteModal(opts);
};
