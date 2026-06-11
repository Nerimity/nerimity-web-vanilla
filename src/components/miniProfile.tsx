import { css } from "@linaria/core";
import { t } from "@lingui/core/macro";
import { Trans } from "@trans";
import morphdom from "morphdom";

import { h, Fragment } from "../h";
import { getUserDetails, type UserDetails } from "../services/userService";
import { accountStore } from "../store/accountStore";
import { channelStore } from "../store/channelStore";
import { messageStore } from "../store/messageStore";
import { userStore } from "../store/userStore";
import { scoped } from "../utils/css";
import { buildImageUrl } from "../utils/image";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { createModal, Modal } from "./modal";
import { UserPresence } from "./userPresence";

export const createMiniProfileHandler = (opts: { signal: AbortSignal }) => {
  document.addEventListener(
    "click",
    (e) => {
      if (e.target instanceof Element) {
        const anchorEl = e.target.closest("a[data-route]") as HTMLAnchorElement;

        const href = anchorEl?.attributes.getNamedItem("href")?.value;

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
              />
            ),
            new AbortController(),
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
        <MiniProfile userId={props.userId} />
      </Modal.Body>
    </Modal.Root>
  );
};

const banner = css`
  aspect-ratio: 16/6;
  position: relative;
  width: 100%;
  .${scoped`bannerImage`} {
    border-radius: var(--radius-4);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    background-color: var(--color);
    filter: brightness(0.8);
  }
`;

const Banner = (props: {
  user: { banner?: string; hexColor?: string };
  children?: any;
}) => {
  const [url] = buildImageUrl(props.user?.banner);
  return (
    <div class={banner}>
      {!url && (
        <div
          style={{ "--color": props.user?.hexColor }}
          class={scoped`bannerImage`}
        />
      )}
      {url && <img class={scoped`bannerImage`} src={url} />}
      <div class={scoped`overlay`}>{props.children}</div>
    </div>
  );
};

const miniProfile = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  .overlayInfo {
    margin-top: -60px;
    margin-left: 10px;
    z-index: 111;
  }

  .section.info {
    .tag {
      color: var(--gray-400);
    }
    .buttons {
      margin-top: 8px;
      display: flex;
      gap: 8px;
      .button {
        flex: 1;
        .icon {
          font-size: 16px;
        }
      }
    }
  }

  .section .stats {
    color: var(--gray-400);
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    .full {
      color: var(--gray-100);
    }
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background-color: var(--gray-900);
    border-radius: var(--radius-4);
    padding: 8px;
  }
`;

const MiniProfile = (props: { userId: string }) => {
  const Content = () => {
    const user = details?.user || localUser;

    const followers = details?.user._count?.followers;
    const following = details?.user._count?.following;

    const hideFollowers = details?.hideFollowers;
    const hideFollowing = details?.hideFollowing || user?.bot;
    const showStats = details && (!hideFollowers || !hideFollowing);
    const isSelf = props.userId === accountStore.currentUser?.id;

    return (
      <>
        <Banner user={user!}></Banner>
        <div class="overlayInfo">
          <Avatar user={user} size={96} />
        </div>
        <div class="section info">
          <span class="name">
            {user?.username}
            <span class="tag">:{user?.tag}</span>
          </span>
          <UserPresence showOffline userId={props.userId} />
          {showStats && (
            <div class="stats">
              {!hideFollowers && (
                <span class="stat">
                  <Trans>
                    <span class="full">{followers}</span> Followers
                  </Trans>
                </span>
              )}
              {!hideFollowing && (
                <span class="stat">
                  <Trans>
                    <span class="full">{following}</span> Following
                  </Trans>
                </span>
              )}
            </div>
          )}
          <div class="buttons">
            <Button
              class="button"
              icon="article_person"
              label={t`Full Profile`}
            />
            <Button
              class="button"
              icon={isSelf ? "book" : "mail"}
              label={isSelf ? t`Notes` : t`Message`}
            />
          </div>
        </div>
      </>
    );
  };
  const miniProfileEl = (<div class={miniProfile}></div>) as HTMLDivElement;

  let localUser = userStore.users.get(props.userId);
  let details: UserDetails | null = null;

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
    morphdom(
      miniProfileEl,
      <div class={miniProfile}>
        <Content />
      </div>,
      {
        childrenOnly: true,
      },
    );
  };

  getUserDetails({ userId: props.userId }).then(([newDetails]) => {
    if (newDetails) {
      if (newDetails.profile?.primaryColor) {
        miniProfileEl.style.setProperty(
          "--primary-color",
          newDetails.profile?.primaryColor,
        );
      }
      details = newDetails;
      render();
    }
  });

  render();
  return miniProfileEl;
};
