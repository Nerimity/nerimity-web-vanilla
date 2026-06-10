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
        const href = e.target
          .closest("a[data-route]")
          ?.attributes.getNamedItem("href")?.value;

        const isProfilePath = router.match<{ id: string }>(
          "/app/profile/:id",
          href,
        );

        if (isProfilePath) {
          console.log(isProfilePath);
          e.preventDefault();
          e.stopPropagation();
          createModal(
            () => <MiniProfileModal userId={isProfilePath.params.id} />,
            new AbortController(),
          );
        }

        console.log(href);
      }
    },
    { signal: opts.signal, capture: true },
  );
};

const MiniProfileModal = (props: { userId: string }) => {
  return (
    <Modal.Root>
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
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .${scoped`overlay`} {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.3);
  }
`;

const Banner = (props: {
  user: { banner?: string; hexColor?: string };
  children?: any;
}) => {
  const [url] = buildImageUrl(props.user.banner!);
  return (
    <div class={banner}>
      <img class={scoped`bannerImage`} src={url} />
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
    margin-top: -40px;
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
        <Avatar user={cachedUser} size={64} />
      </div>
      <div class="section info">
        {cachedUser?.username}
        <span class="tag">:{cachedUser?.tag}</span>
        <UserPresence userId={props.userId} />
      </div>
    </div>
  );
};
