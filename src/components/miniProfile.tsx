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
import { convertShorthandToLinearGradient } from "../utils/color";
import { friendlyTimestamp } from "../utils/date";
import { storeEmitter } from "../utils/EventEmitter";
import { FocusAnimator } from "../utils/FocusAnimator";
import { HoverAnimator } from "../utils/HoverAnimator";
import { buildImageUrl } from "../utils/image";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { CdnIcon } from "./cdnIcon";
import { GradientText } from "./gradientText";
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

    const member = serverMemberStore.serverMembers
      .get(server?.id!)
      ?.get(props.userId);

    const serverRoles = serverStore.currentServerSortedRoles.value();

    const roles = serverRoles.filter((role) =>
      member?.roleIds.includes(role.id),
    );

    const presence = userPresenceStore.presences.get(props.userId);

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
        </div>

        <div class={[style.section, "scrollbarHover"]}>
          {server && (
            <>
              <div class={style.title}>{t`Roles`}</div>
              <div class={style.roles}>
                {roles?.map((role) => (
                  <RoleItem role={role} />
                ))}
                <AddRoleItem />
              </div>
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
    const channelId = channelStore.currentChannelId;
    const messages = messageStore.messages.get(channelId!);
    const message = messages?.find((m) => m.createdBy.id === props.userId);

    if (message) {
      localUser = message.createdBy;
    }
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
        const button = e.target.closest(`.${style.button}`) as HTMLElement;
        if (!button) return;
        if (button.dataset.action === "message") {
          openChannel(props.userId);
          props.abort.abort();
        }
      }
    },
    { once: true },
  );

  render();
  return miniProfileEl;
};

const RoleItem = (props: { role: ServerRole }) => {
  const color = convertShorthandToLinearGradient(props.role.hexColor);

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
  return <div class={[style.role, style.addRole]}>+</div>;
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
    const activities = [
      ...document.querySelector(`.${style.activities}`)!.children!,
    ];
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
