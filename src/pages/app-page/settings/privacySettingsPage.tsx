import { t } from "@lingui/core/macro";

import { Checkbox } from "../../../components/checkbox";
import { Radiobox } from "../../../components/radiobox";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { updateUser } from "../../../services/userService";
import { accountStore } from "../../../store/accountStore";
import { storeEmitter } from "../../../utils/EventEmitter";
import { type SettingsContext } from "./Settings";

import style from "./privacySettingsPage.module.css";

const getStrings = () => ({
  lastOnlineTime: t`Last Online Time`,
  directMessage: t`Direct Message`,
  friendRequests: t`Friend Requests`,
  profileOptions: t`Profile Options`,
});

const privacySettingsPage = (context: SettingsContext) => {
  const strings = getStrings();
  const ac = new AbortController();
  const { signal } = ac;

  const render = () => {
    const user = accountStore.currentUser;
    if (!user) return;
    let el = (
      <div class={style.page}>
        <RadioBlock
          selectedIndex={user.lastOnlineStatus || 0}
          id="lastOnlineStatus"
          icon="schedule"
          label={strings.lastOnlineTime}
          description={t`Set who can see your last online time.`}
          items={[t`Nobody`, t`Friends Only`, t`Friends and Servers`]}
        />
        <RadioBlock
          id="dmStatus"
          selectedIndex={user.dmStatus || 0}

          icon="chat"
          label={strings.directMessage}
          description={t`Set who can send you friend requests.`}
          items={[t`Anybody`, t`Friends and Servers`, t`Friends Only`]}
        />
        <RadioBlock
          id="friendRequestStatus"
          selectedIndex={user.friendRequestStatus || 0}
          icon="person_add"
          label={strings.friendRequests}
          description={t`Set who can send you friend requests.`}
          items={[t`Anybody`, t`Servers Only`, t`Nobody`]}
        />

        <SettingsBlock.Group>
          <SettingsBlock.Root>
            <SettingsBlock.Icon name="person" />
            <SettingsBlock.Details title={strings.profileOptions} />
          </SettingsBlock.Root>

          <SettingsBlock.Root
            clickable
            hideArrow
            data-profile-option="hideFollowers"
          >
            <SettingsBlock.Icon name="person" />
            <SettingsBlock.Details
              title={t`Hide Followers`}
              description={t`Hide your followers from your profile.`}
            />
            <Checkbox.Root checked={user.hideFollowers}>
              <Checkbox.Box />
            </Checkbox.Root>
          </SettingsBlock.Root>

          <SettingsBlock.Root
            clickable
            hideArrow
            data-profile-option="hideFollowing"
          >
            <SettingsBlock.Icon name="person" />
            <SettingsBlock.Details
              title={t`Hide Following`}
              description={t`Hide users you are following from your profile.`}
            />
            <Checkbox.Root checked={user.hideFollowing}>
              <Checkbox.Box />
            </Checkbox.Root>
          </SettingsBlock.Root>
        </SettingsBlock.Group>
      </div>
    ) as HTMLDivElement;
    context.content.replaceChildren(el);
  };
  render();

  let requestSent = false;
  context.content.addEventListener(
    "click",
    async (event) => {
      const target = event.target as HTMLDivElement;
      const profileOption = target.closest(
        "[data-profile-option]",
      ) as HTMLDivElement;

      if (!profileOption) return;

      const option = profileOption.dataset.profileOption as
        | "hideFollowers"
        | "hideFollowing";
      if (requestSent) return;
      requestSent = true;
      await updateUser({
        [option]: !(accountStore.currentUser?.[option] || false),
      });
      requestSent = false;
      render();
    },
    { signal },
  );

  storeEmitter.on(
    "user:update",
    (event) => {
      if (event.user.id === accountStore.currentUser?.id) {
        render();
      }
    },
    signal,
  );

  Radiobox.createHandler({
    el: context.content,
    signal,
    async onChange(event) {
      if (requestSent) return;
      requestSent = true;
      await updateUser({ [event.id]: event.index });
      requestSent = false;
      render();
    },
  });

  // el.addEventListener(
  //   "click",
  //   (e) => {
  //     const target = e.target as HTMLDivElement;
  //   },
  //   { signal },
  // );

  const destroy = () => {
    ac.abort();
    context.content.replaceChildren();
  };
  return { destroy };
};

const RadioBlock = (props: {
  id: string;
  icon: string;
  label: string;
  description?: string;
  items: string[];
  selectedIndex: number;
}) => {
  return (
    <SettingsBlock.Group>
      <SettingsBlock.Root>
        <SettingsBlock.Icon name={props.icon} />
        <SettingsBlock.Details
          title={props.label}
          description={props.description}
        />
      </SettingsBlock.Root>
      <SettingsBlock.Root>
        <Radiobox.Group id={props.id}>
          {props.items.map((name, i) => (
            <Radiobox.Root checked={i === props.selectedIndex}>
              <Radiobox.Box />
              <Radiobox.Label>{name}</Radiobox.Label>
            </Radiobox.Root>
          ))}
        </Radiobox.Group>
      </SettingsBlock.Root>
    </SettingsBlock.Group>
  );
};

export { getStrings, privacySettingsPage as create };
