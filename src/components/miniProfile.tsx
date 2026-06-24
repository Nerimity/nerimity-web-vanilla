import { t } from "@lingui/core/macro";
import { Trans } from "@trans";
import morphdom from "morphdom";

import { h, Fragment } from "../h";
import { getUserDetails, type UserDetails } from "../services/userService";
import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { inboxStore } from "../store/inboxStore";
import { messageStore } from "../store/messageStore";
import { userStore } from "../store/userStore";
import { FocusAnimator } from "../utils/FocusAnimator";
import { HoverAnimator } from "../utils/HoverAnimator";
import { buildImageUrl } from "../utils/image";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Markup } from "./markup/markup";
import { createModal, Modal } from "./modal";
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
  const Content = () => {
    const user = details?.user || localUser;

    const followers = details?.user._count?.followers;
    const following = details?.user._count?.following;

    const hideFollowers = details?.hideFollowers;
    const hideFollowing = details?.hideFollowing || user?.bot;
    const showStats = details && (!hideFollowers || !hideFollowing);
    const isSelf = props.userId === accountStore.currentUser?.id;
    const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);
    const isCurrentChannel = inbox?.recipientId === props.userId;

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
          <span class="name">
            {user?.username}
            <span class={style.tag}>:{user?.tag}</span>
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
  };

  const focusAnimator =
    props.animationMode === "focus"
      ? new FocusAnimator(miniProfileEl, "img")
      : new HoverAnimator(miniProfileEl, [
          { image: "img", trigger: `.${style.miniProfile}` },
        ]);

  props.abort.signal?.addEventListener(
    "abort",
    () => {
      focusAnimator.destroy();
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
