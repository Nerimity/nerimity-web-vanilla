import { ph, t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { Banner } from "../../components/Banner";
import { Icon } from "../../components/icon";
import { ServerClanItem } from "../../components/serverClanItem";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Item } from "../../components/ui/item";
import { Link } from "../../components/ui/link";
import { getExploreItems } from "../../services/exploreService";
import type { RawExploreItem } from "../../Types";
import { timeSince } from "../../utils/date";
import { HoverAnimator } from "../../utils/HoverAnimator";
import type { RouteContext } from "./AppPage";

import style from "./createExploreRoute.module.css";

const Tabs = () => {
  return (
    <div class={style.tabs}>
      <Item.Base selected handlePosition="bottom">
        <Item.Icon name="explore" />
        <Item.Label>All</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom">
        <Item.Icon name="dns" />
        <Item.Label>Servers</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom">
        <Item.Icon name="robot" />
        <Item.Label>Bots</Item.Label>
      </Item.Base>
      <Item.Base handlePosition="bottom">
        <Item.Icon name="palette" />
        <Item.Label>Themes</Item.Label>
      </Item.Base>
    </div>
  );
};

const ServerItem = (props: { item: RawExploreItem }) => {
  const server = props.item.server!;

  const bumpCount = props.item.bumpCount;
  const creator = server.createdBy;

  return (
    <div class={style.serverItem}>
      <Banner server={server} />
      <div class={style.details}>
        <Avatar imgClass="avatar" server={server} size={64} />
        <div class={style.name}>
          {server.name}
          {server.clan && <ServerClanItem clan={server.clan} />}
        </div>
        <div class={style.createdBy}>
          <Trans>
            by{" "}
            <Link
              class={style.creatorUsername}
              href={`/app/profile/${creator.id}`}
              data-user-id={creator.id}
            >
              {ph({ username: creator.username })}
            </Link>
          </Trans>
        </div>
        <div class={style.description}>{props.item.description}</div>
        <div class={style.bumped}>
          <Trans>
            Bumped{" "}
            <span class={style.bumpedDate}>
              {ph({ date: timeSince(props.item.bumpedAt, false) })}
            </span>
          </Trans>
        </div>
        <div class={style.actions}>
          <Button icon="login" label={t`Join server`} primary />
          <Button icon="arrow_upward" label={t`Bump ~ ${bumpCount}`} />
        </div>
      </div>
    </div>
  );
};
const BotItem = (props: { item: RawExploreItem }) => {
  const bot = props.item.botApplication!;
  const botUser = bot.botUser;

  const bumpCount = props.item.bumpCount;
  const creator = bot.creatorAccount.user;

  return (
    <div class={style.serverItem}>
      <Banner user={botUser} />
      <div class={style.details}>
        <Avatar imgClass="avatar" user={botUser} size={64} />
        <div class={style.name}>{botUser.username}</div>
        <div class={style.createdBy}>
          <Trans>
            by{" "}
            <Link
              class={style.creatorUsername}
              href={`/app/profile/${creator.id}`}
              data-user-id={creator.id}
            >
              {ph({ username: creator.username })}
            </Link>
          </Trans>
        </div>
        <div class={style.description}>{props.item.description}</div>
        <div class={style.bumped}>
          <Trans>
            Bumped{" "}
            <span class={style.bumpedDate}>
              {ph({ date: timeSince(props.item.bumpedAt, false) })}
            </span>
          </Trans>
        </div>
        <div class={style.actions}>
          <Button icon="robot_2" label={t`Invite Bot`} primary />
          <Button icon="arrow_upward" label={t`Bump ~ ${bumpCount}`} />
        </div>
      </div>
    </div>
  );
};
const HorizList = (props: { name: string; items: RawExploreItem[] }) => {
  return (
    <div class={style.horizList}>
      <div class={style.header}>
        <div class={style.title}>{props.name}</div>
        <Link href="./servers" class={style.showAll}>
          Show All <Icon name="chevron_forward" />
        </Link>
      </div>
      <div class={style.items}>
        {props.items.map((item) =>
          item.server ? (
            <ServerItem item={item} />
          ) : item.botApplication ? (
            <BotItem item={item} />
          ) : null,
        )}
      </div>
    </div>
  );
};

const createExploreRoute = ({ content }: RouteContext) => {
  const tabContent = (<div></div>) as HTMLDivElement;

  const el = (
    <div class={style.exploreRoute}>
      <Tabs />
      {tabContent}
    </div>
  ) as HTMLDivElement;
  content.replaceChildren(el);

  (async () => {
    tabContent.replaceChildren();
    const [servers] = await getExploreItems({
      type: "server",
      filter: "all",
      sort: "recently_bumped",
      limit: 10,
    });
    if (!servers) return;

    tabContent.appendChild(
      <HorizList name={t`Recently Bumped Servers`} items={servers} />,
    );
    const [bots] = await getExploreItems({
      type: "bot",
      filter: "all",
      sort: "recently_bumped",
      limit: 10,
    });
    if (!bots) return;
    tabContent.appendChild(
      <HorizList name={t`Recently Bumped Bots`} items={bots} />,
    );
    tabContent.appendChild(<HorizList name={t`Recent Themes`} items={[]} />);
  })();

  const hoverAnimator = new HoverAnimator(el, [
    { trigger: `.${style.serverItem}`, image: ".clanIcon img" },
    {
      trigger: `.${style.serverItem}`,
      image: "img.avatar",
    },
    { trigger: `.${style.roleItemContainer}`, image: "img" },
    {
      trigger: `.${style.serverItem}`,
      image: `.banner img`,
    },
  ]);

  const destroy = () => {
    hoverAnimator.destroy();
    el.remove();
  };

  return { destroy };
};

export default createExploreRoute;
