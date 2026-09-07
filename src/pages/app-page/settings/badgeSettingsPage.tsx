import { ph, t } from "@lingui/core/macro";

import { Avatar } from "../../../components/avatar";
import { Checkbox } from "../../../components/checkbox";
import { Icon } from "../../../components/icon";
import { Markup } from "../../../components/markup/markup";
import { alert } from "../../../components/modal";
import { Notice } from "../../../components/Notice";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { UserBadgeItem } from "../../../components/UserBadgeItem";
import { getInventory, toggleBadge } from "../../../services/userService";
import { accountStore } from "../../../store/accountStore";
import { userStore } from "../../../store/userStore";
import { hasBit } from "../../../utils/bitwise";
import { formatTimestamp } from "../../../utils/date";
import {
  UserBadges,
  UserBadgeValues,
  type UserBadge,
} from "../../../utils/UserBadgeFlag";
import { type SettingsContext } from "./Settings";

import style from "./badgeSettingsPage.module.css";

const getStrings = () => ({
  ownedBadges: t`Owned Badges`,
});

const availableBadges = [
  UserBadges.DEER_EARS_WHITE,
  UserBadges.DEER_EARS_HORNS_DARK,
  UserBadges.DEER_EARS_HORNS,
  UserBadges.GOAT_HORNS,
  UserBadges.GOAT_EARS_WHITE,
  UserBadges.WOLF_EARS,
  UserBadges.DOG_SHIBA,
  UserBadges.DOG_EARS_BROWN,
  UserBadges.BUNNY_EARS_MAID,
  UserBadges.BUNNY_EARS_BLACK,
  UserBadges.CAT_EARS_PURPLE,
  UserBadges.CAT_EARS_BLUE,
  UserBadges.CAT_EARS_WHITE,
  UserBadges.CAT_EARS_MAID,
  UserBadges.FOX_EARS_GOLD,
  UserBadges.FOX_EARS_BROWN,
];

const badgeSettingsPage = (context: SettingsContext) => {
  const ac = new AbortController();
  const { signal } = ac;

  let el = (
    <div class={style.page}>
      <Notice
        type="error"
        icon="volunteer_activism"
        title={t`Support Me`}
        description={t`Support my project by donating money. Badges are added manually. Please create a ticket after donating.`}
      />
      <OwnedBadges signal={signal} />
      <SupportMethods />

      <BadgePreview price={9.99} badges={[UserBadges.SUPPORTER]} />
      <BadgePreview price={4.99} badges={availableBadges} />
      <BadgePreview price={0} badges={[UserBadges.PALESTINE]} />
    </div>
  ) as HTMLDivElement;

  context.content.replaceChildren(el);

  // el.addEventListener(
  //   "click",
  //   (e) => {
  //     const target = e.target as HTMLDivElement;
  //   },
  //   { signal },
  // );

  const destroy = () => {
    ac.abort();
    el.remove();
    (el as any) = null;
  };
  return { destroy };
};

const OwnedBadges = (props: { signal: AbortSignal }) => {
  const strings = getStrings();

  let badges: (UserBadge & {
    acquiredAt?: number;
    enabled: () => boolean;
  })[] = [];

  const el = (<div></div>) as HTMLDivElement;

  const rerender = () => {
    el.replaceChildren(
      <div class={style.ownedBadgesContainer}>
        <SettingsBlock.Group>
          <SettingsBlock.Root>
            <SettingsBlock.Icon name="award_star" />
            <SettingsBlock.Details title={strings.ownedBadges} />
          </SettingsBlock.Root>

          <SettingsBlock.Root class={style.gridContainer}>
            {badges.map((b) => (
              <div class={style.gridItem} data-badge-bit={b.bit}>
                <Avatar
                  user={{ ...accountStore.currentUser!, badges: b.bit }}
                  hoverSelector={`[data-badge-bit]`}
                  size={42}
                />
                <SettingsBlock.Details
                  title={
                    <div class={style.badgeContainer}>
                      <UserBadgeItem badge={b} />
                    </div>
                  }
                  description={
                    !!b.acquiredAt &&
                    t`Acquired ${ph({ date: formatTimestamp(b.acquiredAt) })}`
                  }
                />
                {b.removable !== false && (
                  <Checkbox.Root checked={b.enabled()}>
                    <Checkbox.Box />
                  </Checkbox.Root>
                )}
              </div>
            ))}
          </SettingsBlock.Root>
        </SettingsBlock.Group>
      </div>,
    );
  };

  (async () => {
    const [inventory, error] = await getInventory();
    if (error) return;

    badges = UserBadgeValues.filter(
      (b) =>
        b.bit === UserBadges.PALESTINE.bit ||
        inventory.find((i) => parseInt(i.itemId) === b.bit),
    ).map((b) => {
      const i = inventory.find((i) => parseInt(i.itemId) === b.bit);
      return {
        ...b,
        acquiredAt: i?.acquiredAt,
        enabled: () => hasBit(accountStore.currentUser?.badges || 0, b!.bit),
      };
    });

    if (!badges.length) return;

    rerender();
  })();

  let requesting = false;

  el.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLDivElement;
      const badgeEl = target.closest(`[data-badge-bit]`) as HTMLDivElement;
      if (!badgeEl) return;

      const bit = parseInt(badgeEl.dataset.badgeBit as string);

      const badge = UserBadgeValues.find((b) => b.bit === bit);
      if (badge?.removable === false) {
        return alert({ message: t`You cannot modify this badge.` });
      }

      if (requesting) return;
      requesting = true;
      const [res, error] = await toggleBadge(bit);
      requesting = false;
      if (error) {
        alert({ message: error.message });
        return;
      }
      const newBadges = res.badges;

      userStore.users
        .get(accountStore.currentUser?.id!)
        ?.update({ badges: newBadges });
      rerender();
    },
    { signal: props.signal },
  );

  return el;
};

const SupportMethods = () => {
  return (
    <div>
      <SettingsBlock.Group>
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="favorite" />
          <SettingsBlock.Details title={t`Support Methods`} />
        </SettingsBlock.Root>
        <SettingsBlock.Root class={style.gridContainer}>
          <a
            target="_blank"
            href="https://ko-fi.com/supertiger"
            class={style.gridItem}
          >
            <img class={style.supportIcon} src="/third-party/kofi.svg" alt="" />
            <SettingsBlock.Details title="Ko-Fi" />
            <Icon name="open_in_new" class={style.external} />
          </a>
          <a
            target="_blank"
            href="https://boosty.to/supertigerdev/donate"
            class={style.gridItem}
          >
            <img
              class={[style.supportIcon, style.boosty]}
              src="/third-party/boosty.jpg"
              alt=""
            />
            <SettingsBlock.Details title="Boosty" />
            <Icon name="open_in_new" class={style.external} />
          </a>
        </SettingsBlock.Root>
      </SettingsBlock.Group>
    </div>
  );
};

const BadgePreview = (props: { price: number; badges: UserBadge[] }) => {
  return (
    <div>
      <SettingsBlock.Group>
        <SettingsBlock.Root>
          <SettingsBlock.Icon name="favorite" />
          <SettingsBlock.Details title={`$${props.price}`} />
        </SettingsBlock.Root>
        <SettingsBlock.Root class={style.previewGridContainer}>
          {props.badges.map((b) => (
            <div class={style.previewGridItem} data-badge-bit={b.bit}>
              <Avatar
                user={{ ...accountStore.currentUser!, badges: b.bit }}
                hoverSelector={`[data-badge-bit]`}
                size={72}
              />
              <SettingsBlock.Details
                title={
                  <div class={style.badgeContainer}>
                    <UserBadgeItem badge={b} />
                  </div>
                }
                description={<Markup text={b.description()} />}
              />
            </div>
          ))}
        </SettingsBlock.Root>
      </SettingsBlock.Group>
    </div>
  );
};

export { getStrings, badgeSettingsPage as create };
