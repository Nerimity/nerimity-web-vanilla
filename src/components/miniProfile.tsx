import { css } from "@linaria/core";

import { h } from "../h";
import { userStore } from "../store/userStore";
import { scoped } from "../utils/css";
import { buildImageUrl } from "../utils/image";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
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
  console.log(memberItem);

  return (
    <Modal.Root
      pos={{
        x: `${rect?.left}px`,
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
  }

  .section {
    background-color: var(--gray-900);
    border-radius: var(--radius-4);
    padding: 8px;
  }
`;

const MiniProfile = (props: { userId: string }) => {
  const cachedUser = userStore.users.get(props.userId);

  return (
    <div class={miniProfile}>
      <Banner user={cachedUser!}></Banner>
      <div class="overlayInfo">
        <Avatar user={cachedUser} size={96} />
      </div>
      <div class="section info">
        {cachedUser?.username}
        <span class="tag">:{cachedUser?.tag}</span>
        <UserPresence showOffline userId={props.userId} />
      </div>
    </div>
  );
};
