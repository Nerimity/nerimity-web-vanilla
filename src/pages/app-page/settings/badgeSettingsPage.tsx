import { ph, t } from "@lingui/core/macro";

import { Avatar } from "../../../components/avatar";
import { Checkbox } from "../../../components/checkbox";
import { alert } from "../../../components/modal";
import { Notice } from "../../../components/Notice";
import { SettingsBlock } from "../../../components/SettingsBlock";
import { getInventory, toggleBadge } from "../../../services/userService";
import { accountStore } from "../../../store/accountStore";
import { userStore } from "../../../store/userStore";
import { hasBit } from "../../../utils/bitwise";
import { formatTimestamp } from "../../../utils/date";
import { UserBadgeValues, type UserBadge } from "../../../utils/UserBadgeFlag";
import { type SettingsContext } from "./Settings";

import style from "./badgeSettingsPage.module.css";

const getStrings = () => ({
  ownedBadges: t`Owned Badges`,
});

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
    acquiredAt: number;
    enabled: () => boolean;
  })[] = [];

  const el = (<div></div>) as HTMLDivElement;

  const rerender = () => {
    el.replaceChildren(
      <div>
        <SettingsBlock.Group>
          <SettingsBlock.Root>
            <SettingsBlock.Icon name="award_star" />
            <SettingsBlock.Details title={strings.ownedBadges} />
          </SettingsBlock.Root>
          {badges.map((b) => (
            <SettingsBlock.Root clickable hideArrow data-badge-bit={b.bit}>
              <Avatar
                user={{ ...accountStore.currentUser!, badges: b.bit }}
                hoverSelector={`[data-badge-bit]`}
                size={42}
              />
              <SettingsBlock.Details
                title={b.name()}
                description={t`Acquired ${ph({ date: formatTimestamp(b.acquiredAt) })}`}
              />
              {b.removable !== false && (
                <Checkbox.Root checked={b.enabled()}>
                  <Checkbox.Box />
                </Checkbox.Root>
              )}
            </SettingsBlock.Root>
          ))}
        </SettingsBlock.Group>
      </div>,
    );
  };

  (async () => {
    const [inventory, error] = await getInventory();
    if (error) return;

    badges = inventory
      .filter((i) => i.itemType === "badge")
      .map((b) => {
        const badge = UserBadgeValues.find(
          (badge) => badge.bit === parseInt(b.itemId),
        );

        return {
          ...badge!,
          acquiredAt: b.acquiredAt,
          enabled: () =>
            hasBit(accountStore.currentUser?.badges || 0, badge!.bit),
        };
      })
      .sort((a, b) => b.acquiredAt - a.acquiredAt);

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

export { getStrings, badgeSettingsPage as create };
