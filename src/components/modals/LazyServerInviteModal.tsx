import type { ServerInviteModalOpts } from "./ServerInviteModal";

export const createServerInviteModalLazy = async (
  opts: ServerInviteModalOpts,
) => {
  const { _createServerInviteModal } = await import("./ServerInviteModal");
  _createServerInviteModal(opts);
};
