import { h } from "../h";
import { userStore } from "../store/userStore";
import { buildImageUrl } from "../utils/image";
import { router } from "../utils/router";
import { Avatar } from "./avatar";
import { createModal, Modal } from "./modal";

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
      <Modal.Body>
        <MiniProfile userId={props.userId} />
      </Modal.Body>
    </Modal.Root>
  );
};

const Banner = (props: {
  user: { banner?: string; hexColor?: string };
  children?: any;
}) => {
  const [url] = buildImageUrl(props.user.banner!, { size: 128 });
  return (
    <div>
      <img src={url} />
      {props.children}
    </div>
  );
};

const MiniProfile = (props: { userId: string }) => {
  const cachedUser = userStore.users.get(props.userId);

  return (
    <div>
      <Banner user={cachedUser!} />
      <Avatar user={cachedUser} size={64} />
      <span>
        {cachedUser?.username}:{cachedUser?.tag}
      </span>
    </div>
  );
};
