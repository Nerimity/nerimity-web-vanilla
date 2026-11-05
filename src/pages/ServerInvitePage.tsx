import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { Banner } from "../components/Banner";
import { Icon } from "../components/icon";
import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { alert, createModal, Modal } from "../components/ui/modal";
import { Skeleton } from "../components/ui/skeleton";
import { isMobileWidth } from "../config";
import {
  getServerDetailsByCode,
  joinServerByInviteCode,
  type ServerInviteDetails,
} from "../services/serverService";
import { closestFromEvent } from "../utils/dom";
import { getRecentServerChannelId } from "../utils/recentServerChannels";
import { router } from "../utils/router";

import style from "./ServerInvitePage.module.css";

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

  createServerInviteModal({ page: true, code: matcher?.params.code! });

  const destroy = () => {
    ac.abort();
  };

  const render = () => {};

  return { render, destroy };
};

export default createServerInvitePage;

const createServerInviteModal = (opts: { page: boolean; code: string }) => {
  const ac = new AbortController();

  const body = (
    <Modal.Body class={style.serverInviteModal} width="400px">
      <Skeleton style={{ width: "100%", "aspect-ratio": "30/12" }} />
      <div class={style.serverInfo}>
        <Skeleton
          style={{ width: "80px", height: "80px", "border-radius": "50%" }}
        />
        <Skeleton
          style={{ width: "140px", height: "16px", "border-radius": "4px" }}
        />
        <Skeleton
          style={{ width: "80px", height: "12px", "border-radius": "4px" }}
        />
      </div>
    </Modal.Body>
  ) as HTMLDivElement;

  const footer = (
    <Modal.Footer>
      <Skeleton
        class={"button"}
        style={{ "min-width": "100px", height: "38px", "border-radius": "6px" }}
      />
      <Skeleton
        class={"button"}
        style={{ "min-width": "120px", height: "38px", "border-radius": "6px" }}
      />
    </Modal.Footer>
  ) as HTMLDivElement;

  let server: ServerInviteDetails | null = null;
  const fetchDetails = async () => {
    const [serverDetails, err] = await getServerDetailsByCode(opts.code);
    server = serverDetails;
    if (err) {
      body.replaceChildren(
        <div class={style.errorContainer}>
          <Icon class={style.errorIcon} name="error" />
          <div>{err.message}</div>
        </div>,
      );
      footer.replaceChildren(
        <Button
          data-action="close"
          label={t`Back to Nerimity`}
          primary
          icon="home"
        />,
      );
      return;
    }

    footer.replaceChildren(
      <>
        <Button label={t`Don't Join`} data-action="close" hoverBorder />
        {serverDetails.isJoined && (
          <Button
            label={t`Visit Server`}
            data-action="visit"
            icon="login"
            success
            primary
          />
        )}
        {serverDetails.isJoined === false && (
          <Button
            label={t`Join Server`}
            data-action="join"
            icon="login"
            primary
          />
        )}
        {serverDetails.isJoined === null && (
          <Button
            label={t`Login to Join`}
            data-action="login"
            icon="login"
            primary
          />
        )}
      </>,
    );

    const memberCount = serverDetails.memberCount;
    body.replaceChildren(
      <>
        <Banner server={serverDetails} />
        <div class={style.serverInfo}>
          <Avatar server={serverDetails} size={80} />
          <div class={style.serverName}>{serverDetails.name}</div>
          <div class={style.statsRow}>
            <div class={style.stat}>
              <Plural
                value={memberCount}
                _0={
                  <Trans>
                    <span class={style.statValue}>No</span> Members
                  </Trans>
                }
                one={
                  <Trans>
                    <span class={style.statValue}>#</span> Member
                  </Trans>
                }
                other={
                  <Trans>
                    <span class={style.statValue}>#</span> Members
                  </Trans>
                }
              />
            </div>
          </div>
        </div>
      </>,
    );
  };
  fetchDetails();

  const modalEl = (
    <Modal.Root ignoreBgClick={opts.page} disableGestures={opts.page}>
      {body}
      {footer}
    </Modal.Root>
  ) as HTMLDivElement;

  let joining = false;
  modalEl.addEventListener(
    "click",
    async (e) => {
      const actionEl = closestFromEvent(e, "[data-action]");
      const action = actionEl?.dataset.action;
      if (action === "close") {
        location.href = "/app";
      }
      if (action === "visit") {
        const recentChannelId = getRecentServerChannelId(server?.id!);
        const channelId = recentChannelId ?? server?.defaultChannelId!;
        location.href = `/app/servers/${server?.id!}/${channelId}`;
      }
      if (action === "login") {
        location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`;
      }
      if (action === "join") {
        if (joining) return;
        joining = true;
        const labelEl = actionEl?.querySelector(".label") as HTMLSpanElement;
        labelEl.textContent = t`Joining...`;
        const channelId = server?.defaultChannelId!;
        const navigate = () =>
          (location.href = `/app/servers/${server?.id!}/${channelId}`);

        if (opts.page) {
          const [, err] = await joinServerByInviteCode(opts.code);
          labelEl.textContent = t`Join Server`;
          joining = false;
          if (err) {
            alert({ message: err.message });
            return;
          }
          navigate();
          return;
        }
        import("../store/serverStore").then(async ({ serverStore }) => {
          const [, err] = await serverStore.joinServer(server?.id!, opts.code);
          labelEl.textContent = t`Join Server`;
          joining = false;
          if (err) {
            alert({ message: err.message });
            return;
          }
        });
      }
    },
    { signal: ac.signal },
  );

  createModal(() => modalEl, ac);
};
