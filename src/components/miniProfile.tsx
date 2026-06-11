import { css } from "@linaria/core";

import { h } from "../h";
import { channelStore } from "../store/channelStore";
import { messageStore } from "../store/messageStore";
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
  let localUser = userStore.users.get(props.userId);

  if (!localUser) {
    const channelId = channelStore.currentChannelId;
    const messages = messageStore.messages.get(channelId!);
    const message = messages?.find((m) => m.createdBy.id === props.userId);

    if (message) {
      localUser = message.createdBy;
    }
  }

  return (
    <div class={miniProfile}>
      <Banner user={localUser!}></Banner>
      <div class="overlayInfo">
        <Avatar user={localUser} size={96} />
      </div>
      <div class="section info">
        {localUser?.username}
        <span class="tag">:{localUser?.tag}</span>
        <UserPresence showOffline userId={props.userId} />
      </div>
    </div>
  );
};
