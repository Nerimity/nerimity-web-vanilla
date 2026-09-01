import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { getOrCacheChannelNotice } from "../services/channelService";
import {
  getUserDetails,
  updatePresence,
  type UserDetails,
} from "../services/userService";
import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { inboxStore } from "../store/inboxStore";
import { messageStore } from "../store/messageStore";
import { serverMemberStore } from "../store/serverMemberStore";
import type { ServerRole } from "../store/serverRoleStore";
import { serverStore } from "../store/serverStore";
import {
  UserPresenceDetails,
  userPresenceStore,
  UserPresenceType,
} from "../store/userPresenceStore";
import { userStore } from "../store/userStore";
import type { RawUser } from "../Types";
import { resolveGradient } from "../utils/color";
import { friendlyTimestamp } from "../utils/date";
import { storeEmitter } from "../utils/EventEmitter";
import { FocusAnimator } from "../utils/FocusAnimator";
import { getFont } from "../utils/font";
import { HoverAnimator } from "../utils/HoverAnimator";
import { portalElement } from "../utils/portal";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Banner } from "./Banner";
import { Button } from "./button";
import { CdnIcon } from "./cdnIcon";
import { ContextMenu } from "./ContextMenu";
import { Drawer } from "./drawer";
import { createEditServerRolesModal } from "./EditServerRolesModal";
import { GradientText } from "./gradientText";
import { Icon } from "./icon";
import { Input } from "./input";
import { createLogoutModal } from "./LogoutModal";
import { Markup } from "./markup/markup";
import { createModal, Modal } from "./modal";
import { ServerClanItem } from "./serverClanItem";
import { updateActivity, UserActivity } from "./UserActivity";
import { UserPresence } from "./userPresence";

import style from "./miniProfile.module.css";

export interface MiniProfileOverrides {
  bio?: string;
  clanServerId?: string;
  font?: number;
  primaryColor?: string;
}
export const createMiniProfileHandler = (opts: { signal: AbortSignal }) => {
  document.addEventListener(
    "click",
    (e) => {
      if (e.target instanceof Element) {
        const anchorEl = e.target.closest("a[data-route]") as HTMLAnchorElement;
        if (!anchorEl) return;

        const href = anchorEl?.attributes.getNamedItem("href")?.value;
        const options = anchorEl?.dataset.options === "true";

        const noMini = anchorEl.dataset.noMini;
        if (noMini) return;

        const isProfilePath = router.match<{ id: string }>(
          "/app/profile/:id",
          href,
        );

        if (isProfilePath) {
          e.preventDefault();
          e.stopPropagation();
          createMiniProfileModal({
            userId: isProfilePath.params.id,
            triggerEl: anchorEl,
            options,
          });
        }
      }
    },
    { signal: opts.signal, capture: true },
  );
};

export const createMiniProfileModal = (opts: {
  userId: string;
  triggerEl?: HTMLElement;
  options?: boolean;
  overrides?: MiniProfileOverrides;
}) => {
  const modalAbortController = new AbortController();
  createModal(
    () => (
      <MiniProfileModal
        userId={opts.userId}
        triggerEl={opts.triggerEl}
        options={opts.options}
        abort={modalAbortController}
        overrides={opts.overrides}
      />
    ),
    modalAbortController,
  );
};

const MiniProfileModal = (props: {
  userId: string;
  triggerEl?: HTMLElement;
  options?: boolean;
  abort: AbortController;
  overrides?: MiniProfileOverrides;
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
          overrides={props.overrides}
          abort={props.abort}
          options={props.options}
          userId={props.userId}
        />
      </Modal.Body>
    </Modal.Root>
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
  overrides?: MiniProfileOverrides;
  showChannelNotice?: boolean;
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
    const userPresenceContainer = (<div></div>) as HTMLDivElement;

    const renderUserPresence = () => {
      userPresenceContainer.replaceChildren(
        <UserPresence showOffline userId={props.userId} hideActivity />,
      );
    };
    renderUserPresence();
    storeEmitter.on(
      "user:presence_update",
      (event) => {
        if (event.userId !== props.userId) return;
        renderUserPresence();
      },
      contentAbort.signal,
    );

    let noticeEl = props.showChannelNotice
      ? createNoticeSection({ signal: contentAbort.signal })
      : null;

    let rolesEl = createRolesSection({
      userId: props.userId,
      serverId: server?.id,
      signal: contentAbort.signal,
    });

    const member = serverMemberStore.serverMembers
      .get(server?.id!)
      ?.get(props.userId);

    const font = getFont(props.overrides?.font ?? localUser?.profile?.font);

    const clan = (() => {
      if (props.overrides?.clanServerId) {
        const server = serverStore.servers.get(props.overrides?.clanServerId!);
        if (server?.clan) {
          return { ...server.clan, serverId: server.id };
        }
      }

      return details?.profile?.clan;
    })();

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
              <span class={[font?.class, "font"]}>{user?.username}</span>
              <span class={style.tag}>:{user?.tag}</span>
            </span>
            {clan && <ServerClanItem clan={clan} />}
            {details?.followsYou && (
              <span class={style.followsYou}>{t`Follows You`}</span>
            )}
          </span>
          {userPresenceContainer}
          {showStats && (
            <div class={style.stats}>
              {!hideFollowers && (
                <span class={style.stat}>
                  <Plural
                    value={followers || 0}
                    _0={
                      <Trans>
                        <span class={style.full}>No</span> Followers
                      </Trans>
                    }

                    one={
                      <Trans>
                        <span class={style.full}>#</span> Follower
                      </Trans>
                    }
                    other={
                      <Trans>
                        <span class={style.full}>#</span> Followers
                      </Trans>
                    }
                  />
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
                data-no-mini
                href={`/app/profile/${user?.id}`}
                data-action="profile"
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
          <>
            <PresenceOption signal={contentAbort.signal} />
            <CustomStatus signal={contentAbort.signal} />

            <div class={[style.section, style.options]}>
              <Button
                href={`/app/profile/${user?.id}`}
                hoverBorder
                data-no-mini
                label={t`Profile`}
                icon="article_person"
                data-action="profile"
              />
              <Button
                data-action="message"
                hoverBorder
                label={t`Notes`}
                icon="book"
              />
              <Button
                hoverBorder
                data-action="settings"
                label={t`Settings`}
                icon="settings"
                href="/app/settings"
              />
              <Button
                data-action="logout"
                hoverBorder
                label={t`Logout`}
                alert
                icon="logout"
              />
            </div>
          </>
        )}

        {!props.options && (
          <div class={[style.section, "scrollbarHover"]}>
            {noticeEl}
            {server && (
              <div>
                <div class={style.title}>{t`Roles`}</div>
                {rolesEl}
              </div>
            )}

            {!!presence?.activities?.length && (
              <>
                <UserActivities
                  userId={props.userId}
                  signal={contentAbort.signal}
                />
              </>
            )}
            <div>
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
            </div>

            {details?.profile?.bio?.trim() && (
              <div>
                <div class={style.title}>{t`About Me`}</div>
                <div>
                  <Markup
                    class={style.bio}
                    text={props.overrides?.bio ?? details?.profile?.bio}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </>
    );
  };
  let miniProfileEl = (
    <div class={[style.miniProfile, props.class]}></div>
  ) as HTMLDivElement;

  let localUser: RawUser | undefined = userStore.users.get(props.userId);
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

  const primaryColor =
    props.overrides?.primaryColor ?? details?.profile?.primaryColor;

  const render = () => {
    if (primaryColor) {
      miniProfileEl.style.setProperty("--primary-color", primaryColor);
    }

    const colorOne = details?.profile?.bgColorOne || "#000000";
    const colorTwo = details?.profile?.bgColorTwo || "#000000";

    const bg = `linear-gradient(180deg, ${colorOne}, ${colorTwo})`;
    miniProfileEl.style.background = bg;

    miniProfileEl.replaceChildren(<Content />);

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

      miniProfileEl.remove();
      (miniProfileEl as any) = null;
    },
    { once: true },
  );

  if (cached?.userId !== props.userId) {
    getUserDetails({ userId: props.userId }).then(([newDetails]) => {
      if (props.abort.signal.aborted) return;
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
          inboxStore.openChannel(props.userId);
          Drawer().updatePage({ page: 1 });

          props.abort.abort();
        }
        if (button.dataset.action === "settings") {
          props.abort.abort();
        }
        if (button.dataset.action === "logout") {
          createLogoutModal();
        }
        if (button.dataset.action === "profile") {
          props.abort.abort();
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
    const presence = userPresenceStore.presences.get(props.userId);
    const activities = presence?.activities || [];
    activitiesContainer.replaceChildren(
      ...activities.map((activity) => (
        <UserActivity activity={activity} userId={props.userId} />
      )),
    );
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
  props.signal.addEventListener("abort", () => clearInterval(intervalId), {
    once: true,
  });

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
const createNoticeSection = (props: { signal: AbortSignal }) => {
  const noticeContentEl = (<div class={style.content}></div>) as HTMLDivElement;

  const el = (
    <div style={{ display: "none" }} class={style.notice}>
      <div class={style.title}>{t`Notice`}</div>
      {noticeContentEl}
    </div>
  ) as HTMLDivElement;

  const fetch = () => {
    el.style.display = "none";
    if (!accountStore.authenticated) return;
    getOrCacheChannelNotice(channelStore.currentChannelId!).then((notice) => {
      if (!notice) return;
      noticeContentEl.replaceChildren(<Markup inline text={notice} />);
      el.style.display = "flex";
    });
  };

  storeEmitter.on("navigate:channelId", fetch, props.signal);
  storeEmitter.on("ws:authStateUpdate", fetch, props.signal);
  fetch();

  return el;
};

const PresenceOption = (props: { signal: AbortSignal }) => {
  let el = (
    <div class={[style.section, style.presenceOption]}></div>
  ) as HTMLDivElement;

  const PresenceContextMenu = (props: { x: string; y: string }) => {
    const userId = accountStore.currentUser?.id;
    const presence = userPresenceStore.presences.get(userId!);
    return (
      <ContextMenu.Root pos={{ x: props.x, y: props.y }}>
        {Object.values(UserPresenceDetails)
          .sort((a, b) => {
            if (a.id === "OFFLINE") return 1;
            if (b.id === "OFFLINE") return -1;
            return 0;
          })
          .map((p) => {
            const id = p.id as keyof typeof UserPresenceType;
            const apiId = UserPresenceType[id];

            return (
              <ContextMenu.Item id={p.id} selected={presence?.status === apiId}>
                <div
                  class={style.presenceDot}
                  style={{ "--color": `var(--status-${p.id.toLowerCase()})` }}
                />

                <ContextMenu.Label>
                  {p.id === "OFFLINE" ? t`Appear As Offline` : p.text}
                </ContextMenu.Label>
              </ContextMenu.Item>
            );
          })}
      </ContextMenu.Root>
    );
  };
  const rerender = () => {
    el.replaceChildren(
      <>
        <UserPresence
          class={style.userPresence}
          hideActivity
          userId={accountStore.currentUser?.id!}
          hideCustomStatus
          showOffline
        />
        <Icon name="chevron_forward" />
      </>,
    );
  };

  storeEmitter.on(
    "user:presence_update",
    (event) => {
      if (event.userId !== accountStore.currentUser?.id) return;
      rerender();
    },
    props.signal,
  );

  el.addEventListener(
    "click",
    (event) => {
      const abortController = new AbortController();

      const rect = (
        event.currentTarget as HTMLDivElement
      ).getBoundingClientRect();

      createModal(
        () => (
          <PresenceContextMenu
            x={`${rect.x + rect.width}px`}
            y={`${rect.y}px`}
          />
        ),
        abortController,
      );

      portalElement().addEventListener(
        "click",
        (event) => {
          const target = event.target as HTMLElement;
          const item = target.closest(".ctx-item");
          if (!item) return;
          abortController.abort();
          const id = item.id as keyof typeof UserPresenceType;
          const apiId = UserPresenceType[id];
          if (apiId >= 0) {
            updatePresence({ status: apiId });
          }
        },
        { signal: abortController.signal },
      );
    },
    { signal: props.signal },
  );

  rerender();
  return el;
};

const CustomStatus = (props: { signal: AbortSignal }) => {
  let el = (
    <div class={[style.section, style.customStatusOption]}></div>
  ) as HTMLDivElement;

  const rerender = () => {
    const presence = userPresenceStore.presences.get(
      accountStore.currentUser?.id!,
    );
    el.replaceChildren(
      <>
        <Icon class={style.icon} name="edit" />
        <Markup
          text={presence?.custom ?? t`Set Custom Status`}
          inline
          animateInitialOnFocus
          animateEmoji
          class={style.markup}
        />
      </>,
    );
  };

  el.addEventListener(
    "click",
    () => {
      createCustomStatusModal();
    },
    { signal: props.signal },
  );

  storeEmitter.on(
    "user:presence_update",
    (event) => {
      if (event.userId !== accountStore.currentUser?.id) return;
      rerender();
    },
    props.signal,
  );

  // el.addEventListener("click", (event) => {}, { signal: props.signal });

  rerender();
  return el;
};

const createCustomStatusModal = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const previewEl = (
    <div class={style.customStatusPreview}></div>
  ) as HTMLDivElement;

  const el = (
    <Modal.Root>
      <Modal.Header label={t`Set Custom Status`} icon="edit" />
      <Modal.Body width="300px">
        {previewEl}
        <Input
          class={style.customStatusInput}
          placeholder={t`What are you up to?`}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button data-action="cancel" label={t`Don't save`} hoverBorder />
        <Button data-action="save" icon="save" label={t`Save`} />
      </Modal.Footer>
    </Modal.Root>
  ) as HTMLDivElement;

  const presence = userPresenceStore.presences.get(
    accountStore.currentUser?.id!,
  );

  const inputEl = el.querySelector(
    `.${style.customStatusInput} input`,
  ) as HTMLInputElement;
  inputEl.value = presence?.custom || "";

  const updatePreview = () => {
    const val = inputEl.value.trim();
    previewEl.classList.toggle(style.hide!, !val);
    previewEl.replaceChildren(
      <div class={style.inner}>
        <Markup text={val} inline animateEmoji />
      </div>,
    );
  };
  updatePreview();

  inputEl.addEventListener("input", updatePreview, { signal });

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest("[data-action]") as HTMLElement;
      if (!button) return;
      const action = button.dataset.action;
      switch (action) {
        case "cancel":
          abortController.abort();
          break;
        case "save":
          updatePresence({ custom: inputEl.value });
          abortController.abort();
          break;
        default:
          break;
      }
    },
    { signal },
  );

  createModal(() => el, abortController);
};
