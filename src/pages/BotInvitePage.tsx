import { createBotInviteModal } from "../components/modals/BotInviteModal";
import { isMobileWidth } from "../config";
import { router } from "../utils/router";

const createBotInvitePage = () => {
  const ac = new AbortController();
  const { signal } = ac;
  const updateResponsiveClasses = () => {
    document.body.classList.toggle("mobileWidth", isMobileWidth());
    document.body.classList.toggle("desktopWidth", !isMobileWidth());
  };
  updateResponsiveClasses();
  window.addEventListener("resize", updateResponsiveClasses, { signal });

  const matcher = router.match<{ appId: string }>("/bot/:appId");

  const getQuery = router.query<{ perms: string }>();

  createBotInviteModal({
    page: true,
    appId: matcher?.params.appId!,
    perms: parseInt(getQuery()?.perms ?? "0"),
  });

  const destroy = () => {
    ac.abort();
  };

  const render = () => {};

  return { render, destroy };
};

export default createBotInvitePage;
