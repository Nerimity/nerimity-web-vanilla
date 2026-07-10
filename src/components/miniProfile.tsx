import { t } from "@lingui/core/macro";
import { Trans } from "@trans";
import morphdom from "morphdom";

import { h, Fragment } from "../h";
import { getUserDetails, type UserDetails } from "../services/userService";
import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { inboxStore } from "../store/inboxStore";
import { messageStore } from "../store/messageStore";
import { serverMemberStore } from "../store/serverMemberStore";
import type { ServerRole } from "../store/serverRoleStore";
import { serverStore } from "../store/serverStore";
import { userPresenceStore } from "../store/userPresenceStore";
import { userStore } from "../store/userStore";
import { resolveGradient } from "../utils/color";
import { friendlyTimestamp } from "../utils/date";
import { storeEmitter } from "../utils/EventEmitter";
import { FocusAnimator } from "../utils/FocusAnimator";
import { HoverAnimator } from "../utils/HoverAnimator";
import { buildImageUrl } from "../utils/image";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { CdnIcon } from "./cdnIcon";
import { createEditServerRolesModal } from "./EditServerRolesModal";
import { GradientText } from "./gradientText";
import { createLogoutModal } from "./LogoutModal";
import { Markup } from "./markup/markup";
import { createModal, Modal } from "./modal";
import { ServerClanItem } from "./serverClanItem";
import { updateActivity, UserActivity } from "./UserActivity";
import { UserPresence } from "./userPresence";

import style from "./miniProfile.module.css";

export const createMiniProfileHandler = (opts: { signal: AbortSignal }) => {
  document.addEventListener(
    "click",
    (e) => {
      if (e.target instanceof Element) {
        const anchorEl = e.target.closest("a[data-route]") as HTMLAnchorElement;

        const href = anchorEl?.attributes.getNamedItem("href")?.value;
        const options = anchorEl?.dataset.options === "true";

        const modalAbortController = new AbortController();

        const isProfilePath = router.match<{ id: string }>(
          "/app/profile/:id",
          href,
        );

        if (isProfilePath) {
          e.preventDefault();
          e.stopPropagation();
          createModal(
            () => (
              <MiniProfileModal
                userId={isProfilePath.params.id}
                triggerEl={anchorEl!}
                options={options}
                abort={modalAbortController}
              />
            ),
            modalAbortController,
          );
        }
      }
    },
    { signal: opts.signal, capture: true },
  );
};

const MiniProfileModal = (props: {
  userId: string;
  triggerEl?: HTMLElement;
  options?: boolean;
  abort: AbortController;
}) => {
  const rect = props.triggerEl?.getBoundingClientRect();

  const memberItem = props.triggerEl?.classList.contains("memberItem");

  return (
    <Modal.Root
      pos={{
        x: `${memberItem ? rect?.left : rect?.right! + 10}px`,
        y: `${rect?.top}px`,
        anchor: memberItem ? "center-right" : "center-left",
      }}
    >
      <Modal.Body width="400px">
        <MiniProfile
          animationMode="focus"
          abort={props.abort}
          options={props.options}
          userId={props.userId}
        />
      </Modal.Body>
    </Modal.Root>
  );
};

const Banner = (props: {
  user: { banner?: string; hexColor?: string };
  children?: any;
  initialAnimate?: boolean;
}) => {
  const [url, animated] = buildImageUrl(props.user?.banner, {
    animate: props.initialAnimate,
  });
  return (
    <div class={style.banner}>
      {!url && (
        <div
          style={{ "--color": props.user?.hexColor }}
          class={style.bannerImage}
        />
      )}
      {url && (
        <img
          {...(animated && { "data-img-anim": "" })}
          class={style.bannerImage}
          src={url}
        />
      )}
      <div class={style.overlay}>{props.children}</div>
    </div>
  );
};

interface UserDetailsCache {
  cachedAt: number;
  userId: string;
  details: UserDetails;
}

let cached: UserDetailsCache | null = null;

export const MiniProfile = (props: {
  userId: string;
  class?: string | string[];
  abort: AbortController;
  animationMode: "hover" | "focus";
  options?: boolean;
}) => {
  let contentAbort: AbortController | undefined;
  const Content = () => {
    contentAbort?.abort();

    contentAbort = new AbortController();
    const user = details?.user || localUser;

    const followers = details?.user._count?.followers;
    const following = details?.user._count?.following;

    const hideFollowers = details?.hideFollowers;
    const hideFollowing = details?.hideFollowing || user?.bot;
    const showStats = details && (!hideFollowers || !hideFollowing);
    const isSelf = props.userId === accountStore.currentUser?.id;
    const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);
    const isCurrentChannel = inbox?.recipientId === props.userId;

    const server = serverStore.servers.get(serverStore.currentServerId!);
    const presence = userPresenceStore.presences.get(props.userId);

    let rolesEl = createRolesSection({
      userId: props.userId,
      serverId: server?.id,
      signal: contentAbort.signal,
    });

    const member = serverMemberStore.serverMembers
      .get(server?.id!)
      ?.get(props.userId);

    return (
      <>
        <Banner
          initialAnimate={
            props.animationMode === "focus" && document.hasFocus()
          }
          user={user!}
        ></Banner>
        <div class={style.overlayInfo}>
          <Avatar user={user} size={96} />
        </div>
        <div class={[style.section, style.info]}>
          <span class={style.name}>
            <span>
              {user?.username}
              <span class={style.tag}>:{user?.tag}</span>
            </span>
            {details?.profile?.clan && (
              <ServerClanItem clan={details.profile.clan} />
            )}
          </span>
          <UserPresence showOffline userId={props.userId} hideActivity />
          {showStats && (
            <div class={style.stats}>
              {!hideFollowers && (
                <span class={style.stat}>
                  <Trans>
                    <span class={style.full}>{followers}</span> Followers
                  </Trans>
                </span>
              )}
              {!hideFollowing && (
                <span class={style.stat}>
                  <Trans>
                    <span class={style.full}>{following}</span> Following
                  </Trans>
                </span>
              )}
            </div>
          )}
          {!props.options && (
            <div class={style.buttons}>
              <Button
                class={style.button}
                icon="article_person"
                label={t`Full Profile`}
              />
              {!isCurrentChannel && (
                <Button
                  class={style.button}
                  icon={isSelf ? "book" : "mail"}
                  data-action="message"
                  label={isSelf ? t`Notes` : t`Message`}
                />
              )}
            </div>
          )}
        </div>

        {props.options && (
          <div class={[style.section, style.options]}>
            <Button hoverBorder label={t`Profile`} icon="article_person" />
            <Button
              data-action="message"
              hoverBorder
              label={t`Notes`}
              icon="book"
            />
            <Button hoverBorder label={t`Settings`} icon="settings" />
            <Button
              data-action="logout"
              hoverBorder
              label={t`Logout`}
              alert
              icon="logout"
            />
          </div>
        )}

        {!props.options && (
          <div class={[style.section, "scrollbarHover"]}>
            {server && (
              <>
                <div class={style.title}>{t`Roles`}</div>
                {rolesEl}
              </>
            )}

            {!!presence?.activities?.length && (
              <>
                <UserActivities
                  userId={props.userId}
                  signal={contentAbort.signal}
                />
              </>
            )}

            <div class={style.title}>{t`Joined`}</div>
            <div class={style.joined}>
              <div class={style.joinedContainer}>
                <img class={style.logo} src="/logo.png" />
                <div>{friendlyTimestamp(user?.joinedAt || 0)}</div>
              </div>
              {member && (
                <div class={style.joinedContainer}>
                  <Avatar server={server} size={14} />
                  <div>{friendlyTimestamp(member?.joinedAt || 0)}</div>
                </div>
              )}
            </div>

            <div class={style.title}>{t`About Me`}</div>
            <div>
              <Markup text={details?.profile?.bio || ""} />
            </div>
          </div>
        )}
      </>
    );
  };
  const miniProfileEl = (
    <div class={[style.miniProfile, props.class]}></div>
  ) as HTMLDivElement;

  let localUser = userStore.users.get(props.userId);
  let details: UserDetails | null = null;

  if (cached?.userId === props.userId) {
    if (cached.cachedAt + 60 * 1000 > Date.now()) {
      details = cached.details;
    } else {
      cached = null;
    }
  }

  if (!localUser) {
    const user = messageStore.findUserInCurrentMessages(props.userId);
    localUser = user;
  }

  miniProfileEl.appendChild(<Content />);

  const render = () => {
    if (details?.profile?.primaryColor) {
      miniProfileEl.style.setProperty(
        "--primary-color",
        details.profile.primaryColor,
      );
    }

    const colorOne = details?.profile?.bgColorOne || "#000000";
    const colorTwo = details?.profile?.bgColorTwo || "#000000";

    const bg = `linear-gradient(180deg, ${colorOne}, ${colorTwo})`;
    miniProfileEl.style.background = bg;

    morphdom(
      miniProfileEl,
      <div class={style.miniProfile}>
        <Content />
      </div>,
      {
        childrenOnly: true,
      },
    );

    focusAnimator.destroy();
    focusAnimator =
      props.animationMode === "focus"
        ? new FocusAnimator(miniProfileEl, "img")
        : new HoverAnimator(miniProfileEl, [
            { image: "img", trigger: `.${style.miniProfile}` },
          ]);
  };

  let focusAnimator =
    props.animationMode === "focus"
      ? new FocusAnimator(miniProfileEl, "img")
      : new HoverAnimator(miniProfileEl, [
          { image: "img", trigger: `.${style.miniProfile}` },
        ]);

  props.abort.signal?.addEventListener(
    "abort",
    () => {
      focusAnimator.destroy();
      contentAbort?.abort();
    },
    { once: true },
  );

  if (cached?.userId !== props.userId) {
    getUserDetails({ userId: props.userId }).then(([newDetails]) => {
      if (newDetails) {
        cached = {
          cachedAt: Date.now(),
          details: newDetails,
          userId: props.userId,
        };

        details = newDetails;
        render();
      }
    });
  }

  let dmOpening = false;
  const openChannel = async (userId: string) => {
    if (dmOpening) return;
    dmOpening = true;
    const inbox = await inboxStore.loadInbox(userId).finally(() => {
      dmOpening = false;
    });
    if (!inbox) return;
    router.navigate(`/app/inbox/${inbox.channelId}`);
  };

  miniProfileEl.addEventListener(
    "click",
    (e) => {
      if (e.target instanceof Element) {
        const role = e.target.closest(`.${style.role}`) as HTMLElement;
        if (role) {
          if (role.dataset.action === "edit_role") {
            createEditServerRolesModal({
              userId: props.userId,
              username: details?.user.username,
            });
          }
        }

        const button = e.target.closest(".button") as HTMLElement;
        if (!button) return;
        if (button.dataset.action === "message") {
          openChannel(props.userId);
          props.abort.abort();
        }
        if (button.dataset.action === "logout") {
          createLogoutModal();
        }
      }
    },
    { signal: props.abort.signal },
  );

  render();
  return miniProfileEl;
};

const RoleItem = (props: { role: ServerRole }) => {
  const color = resolveGradient(props.role.hexColor);

  return (
    <div class={style.role}>
      {props.role.icon && (
        <CdnIcon role={props.role} size={18} class={style.icon} />
      )}
      <GradientText color={color} class={style.roleText}>
        {props.role.name}
      </GradientText>
    </div>
  );
};
const AddRoleItem = () => {
  return (
    <div data-action="edit_role" class={[style.role, style.addRole]}>
      +
    </div>
  );
};

const UserActivities = (props: { userId: string; signal: AbortSignal }) => {
  let activitiesContainer = (
    <div class={style.activities}></div>
  ) as HTMLDivElement;

  const rerender = () => {
    let newCont = document.querySelector(`.${style.activities}`);
    if (newCont) {
      activitiesContainer = newCont as HTMLDivElement;
    }
    const presence = userPresenceStore.presences.get(props.userId);
    const activities = presence?.activities || [];
    activitiesContainer.replaceChildren(
      ...activities.map((activity) => (
        <UserActivity activity={activity} userId={props.userId} />
      )),
    );
    // morphdom(
    //   activitiesContainer,
    //   <div class={style.activities}>
    //     {activities.map((activity) => (
    //       <UserActivity activity={activity} userId={props.userId} />
    //     ))}
    //   </div>,
    //   {
    //     childrenOnly: true,
    //   },
    // );
  };

  const intervalId = setInterval(() => {
    const activitiesEl = document.querySelector(`.${style.activities}`);
    if (!activitiesEl) return;

    const activities = [...activitiesEl.children!];
    for (let i = 0; i < activities.length; i++) {
      const activityEl = activities[i] as HTMLDivElement;
      updateActivity(activityEl);
    }
  }, 1000);
  props.signal.addEventListener("abort", () => clearInterval(intervalId));

  rerender();
  storeEmitter.on(
    "user:presence_update",
    (event) => {
      if (event.userId !== props.userId) return;
      rerender();
    },
    props.signal,
  );

  return activitiesContainer;
};

const createRolesSection = (opts: {
  serverId?: string;
  userId: string;
  signal: AbortSignal;
}) => {
  if (!opts.serverId) return;

  let rolesEl = (<div class={style.roles}></div>) as HTMLDivElement;

  const member = serverMemberStore.serverMembers
    .get(opts.serverId!)
    ?.get(opts.userId);

  const renderRoles = () => {
    rolesEl = (document.querySelector(`.${style.roles}`) ||
      rolesEl) as HTMLDivElement;

    const serverRoles = serverStore.currentServerSortedRoles.value();

    const roles = serverRoles.filter((role) =>
      member?.roleIds.includes(role.id),
    );

    if (!roles) return;
    rolesEl?.replaceChildren(
      ...roles.map((role) => (<RoleItem role={role} />) as HTMLElement),
      (<AddRoleItem />) as HTMLElement,
    );
  };

  renderRoles();

  storeEmitter.on(
    "server:member_update",
    (event) => {
      if (event.userId !== opts.userId) return;
      if (event.serverId !== opts.serverId) return;
      renderRoles();
    },
    opts.signal,
  );
  storeEmitter.on(
    "server:update_role",
    (event) => {
      if (event.serverId !== opts.serverId) return;
      renderRoles();
    },
    opts.signal,
  );
  return rolesEl;
};
