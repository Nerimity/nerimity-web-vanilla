import { createServerInviteModalLazy } from "../components/modals/LazyServerInviteModal";
import { isMobileWidth } from "../config";
import { router } from "../utils/router";

const createServerInvitePage = () => {
  const ac = new AbortController();
  const { signal } = ac;
  const updateResponsiveClasses = () => {
    document.body.classList.toggle("mobileWidth", isMobileWidth());
    document.body.classList.toggle("desktopWidth", !isMobileWidth());
  };
  updateResponsiveClasses();
  window.addEventListener("resize", updateResponsiveClasses, { signal });

  const matcher = router.match<{ code: string }>("/i/:code");

  createServerInviteModalLazy({ page: true, code: matcher?.params.code! });

  const destroy = () => {
    ac.abort();
  };

  const render = () => {};

  return { render, destroy };
};

export default createServerInvitePage;
