import { ph, t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { Banner } from "../../components/Banner";
import { Icon } from "../../components/icon";
import { Notice } from "../../components/Notice";
import { ServerClanItem } from "../../components/serverClanItem";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Dropdown } from "../../components/ui/createDropdown";
import { Input } from "../../components/ui/input";
import { Item } from "../../components/ui/item";
import { Link } from "../../components/ui/link";
import { Skeleton } from "../../components/ui/skeleton";
import {
  getExploreItems,
  getExploreThemes,
  type ExploreTheme,
  type PublicServerFilter,
  type PublicServerSort,
} from "../../services/exploreService";
import { accountStore } from "../../store/accountStore";
import { serverStore } from "../../store/serverStore";
import type { RawExploreItem } from "../../Types";
import { timeSince } from "../../utils/date";
import { debounce } from "../../utils/debounce";
import { closestFromEvent } from "../../utils/dom";
import { storeEmitter } from "../../utils/EventEmitter";
import { HoverAnimator } from "../../utils/HoverAnimator";
import { createIntersectionObserver } from "../../utils/observer";
import { getRecentServerChannelId } from "../../utils/recentServerChannels";
import { router } from "../../utils/router";
import {
  DefaultTheme,
  normalizeThemeColors,
  updateTheme,
} from "../../utils/theme";
import type { RouteContext } from "./AppPage";

import style from "./createExploreRoute.module.css";

const Tabs = () => {
  return (
    <div class={style.tabs}>
      <Item.Base data-tab="all" href="/app/explore" handlePosition="bottom">
        <Item.Icon name="explore" />
        <Item.Label>All</Item.Label>
      </Item.Base>
      <Item.Base
        data-tab="servers"
        href="/app/explore/servers"
        handlePosition="bottom"
      >
        <Item.Icon name="dns" />
        <Item.Label>Servers</Item.Label>
      </Item.Base>
      <Item.Base
        data-tab="bots"
        href="/app/explore/bots"
        handlePosition="bottom"
      >
        <Item.Icon name="robot" />
        <Item.Label>Bots</Item.Label>
      </Item.Base>
      <Item.Base
        data-tab="themes"
        href="/app/explore/themes"
        handlePosition="bottom"
      >
        <Item.Icon name="palette" />
        <Item.Label>Themes</Item.Label>
      </Item.Base>
    </div>
  );
};

const elToExploreTheme = new WeakMap<HTMLElement, ExploreTheme>();

const ServerItem = (props: { item: RawExploreItem }) => {
  const server = props.item.server!;

  const bumpCount = props.item.bumpCount;
  const memberCount = server._count.serverMembers;
  const creator = server.createdBy;
  const lifetimeBumps = props.item.lifetimeBumpCount.toLocaleString();

  const alreadyJoined = !!serverStore.servers.get(server.id);

  return (
    <div class={style.serverItem} data-server-id={server.id}>
      <Banner server={server} />
      <div class={style.details}>
        <Avatar
          hoverSelector={`.${style.serverItem}`}
          imgClass="avatar"
          server={server}
          size={64}
        />
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

        <div class={style.statsRow}>
          <div class={style.stat}>
            <Plural
              value={memberCount}
              _0={
                <Trans>
                  <span class={style.statValue}>No</span> Members
                </Trans>
              }
              one={
                <Trans>
                  <span class={style.statValue}>#</span> Member
                </Trans>
              }
              other={
                <Trans>
                  <span class={style.statValue}>#</span> Members
                </Trans>
              }
            />
          </div>
          <div
            class={style.stat}
            data-tooltip={t`${ph({ count: lifetimeBumps })} Lifetime Bumps`}
          >
            <Trans>
              Bumped{" "}
              <span class={style.statValue}>
                {ph({ date: timeSince(props.item.bumpedAt, false) })}
              </span>
            </Trans>
          </div>
        </div>
        <div class={style.actions}>
          <Button
            icon="login"
            href={
              alreadyJoined
                ? `/app/servers/${server?.id}/${getRecentServerChannelId(server?.id!)}`
                : undefined
            }
            data-action={alreadyJoined ? undefined : "join"}
            label={alreadyJoined ? t`Visit Server` : t`Join Server`}
            success={alreadyJoined}
            primary
          />
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

  const inServerCount = bot.botUser._count.servers;

  const isOnline = props.item.botApplication?.botUser.online;
  const lifetimeBumps = props.item.lifetimeBumpCount;

  return (
    <div class={style.serverItem}>
      <Banner user={botUser} />
      <div class={style.details}>
        <Avatar
          hoverSelector={`.${style.serverItem}`}
          imgClass="avatar"
          user={botUser}
          size={64}
        />
        <Link
          href={`/app/profile/${botUser.id}`}
          data-user-id={botUser.id}
          class={style.name}
        >
          <span class={[style.status, isOnline && style.online]}></span>

          {botUser.username}
        </Link>
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

        <div class={style.statsRow}>
          <div class={style.stat}>
            <Plural
              value={inServerCount}
              _0={
                <Trans>
                  <span class={style.statValue}>No</span> Servers
                </Trans>
              }
              one={
                <Trans>
                  <span class={style.statValue}>#</span> Server
                </Trans>
              }
              other={
                <Trans>
                  <span class={style.statValue}>#</span> Servers
                </Trans>
              }
            />
          </div>
          <div
            class={style.stat}
            data-tooltip={t`${ph({ count: lifetimeBumps })} Lifetime Bumps`}
          >
            <Trans>
              Bumped{" "}
              <span class={style.statValue}>
                {ph({ date: timeSince(props.item.bumpedAt, false) })}
              </span>
            </Trans>
          </div>
        </div>
        <div class={style.actions}>
          <Button icon="robot_2" label={t`Invite Bot`} primary />
          <Button icon="arrow_upward" label={t`Bump ~ ${bumpCount}`} />
        </div>
      </div>
    </div>
  );
};
const ThemeItem = (props: { item: ExploreTheme }) => {
  const name = props.item.name;
  const maintainers = props.item.maintainers?.map((maintainer) => (
    <>
      <span class={style.creatorUsername}>{maintainer}</span>
      {maintainer !==
        props.item.maintainers?.[props.item.maintainers.length - 1] && ", "}
    </>
  ));

  const mergedColors = normalizeThemeColors(props.item.colors);

  const el = (
    <div
      class={[style.serverItem, style.themeItem]}
      style={Object.entries(mergedColors).reduce(
        (acc, [key, value]) => {
          if (Object.hasOwn(DefaultTheme, key)) {
            acc[`--${key}`] = value;
          }
          return acc;
        },
        {} as Record<string, string>,
      )}
    >
      <div class={style.details}>
        <div class={style.name}>{name}</div>

        <span class={style.createdBy}>
          <Trans>Contributors: {maintainers}</Trans>
        </span>

        <div class={style.colorPreview}>
          {Object.keys(DefaultTheme).map((key) => (
            <span
              class={style.colorPreviewItem}
              style={{ "--color": mergedColors[key] }}
            ></span>
          ))}
        </div>

        <div class={style.actions}>
          <Button
            icon="palette"
            data-action="apply-theme"
            label={t`Apply Theme`}
            primary
          />
        </div>
      </div>
    </div>
  ) as HTMLDivElement;

  elToExploreTheme.set(el, props.item);
  return el;
};
const HorizList = (props: {
  name: string;
  items?: RawExploreItem[];
  themes?: ExploreTheme[];
  hideShowAll?: boolean;
  href?: string;
}) => {
  return (
    <div class={style.horizList}>
      <div class={style.header}>
        <div class={style.title}>{props.name}</div>
        {!props.hideShowAll && (
          <Link href={props.href} class={style.showAll}>
            Show All <Icon name="chevron_forward" />
          </Link>
        )}
      </div>
      <div class={style.items}>
        {props.themes?.map((theme) => (
          <ThemeItem item={theme} />
        ))}
        {props.items?.map((item) =>
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

const ItemSkeleton = () => (
  <div class={[style.serverItem, style.skeletonCard]} aria-hidden="true">
    <Skeleton class={style.skeletonBanner} />
    <div class={style.skeletonDetails}>
      <Skeleton class={style.skeletonAvatar} />
      <Skeleton class={style.skeletonLine} style={{ width: "45%" }} />
      <Skeleton class={style.skeletonLine} style={{ width: "30%" }} />
      <Skeleton class={style.skeletonLine} style={{ width: "90%" }} />
      <Skeleton class={style.skeletonLine} style={{ width: "60%" }} />
      <div class={style.skeletonActions}>
        <Skeleton class={style.skeletonButton} />
        <Skeleton class={style.skeletonButton} />
      </div>
    </div>
  </div>
);

const ListSkeleton = (props: {
  name?: boolean;
  grid?: boolean;
  count?: number;
}) => {
  const items = Array.from({ length: props.count ?? 4 }, () => (
    <ItemSkeleton />
  ));
  const title = (
    <Skeleton class={style.skeletonTitle} style={{ width: "140px" }} />
  );

  if (props.grid) {
    return (
      <div class={style.gridListContainer}>
        {props.name && title}
        <div class={style.gridList}>{items}</div>
      </div>
    );
  }
  return (
    <div class={style.horizList}>
      <div class={style.header}>{title}</div>
      <div class={style.items}>{items}</div>
    </div>
  );
};

type Tab = "all" | "servers" | "bots" | "themes";

const getExploreThemesArray = async () => {
  const [themes] = await getExploreThemes();
  if (!themes) return;

  const themesArray = Object.values(themes);
  themesArray.unshift({
    name: "Default",
    maintainers: ["Superkitten"],
    colors: DefaultTheme,
  });
  return themesArray;
};

const createExploreRoute = ({ content }: RouteContext) => {
  const ac = new AbortController();
  const { signal } = ac;
  const tabContent = (<div></div>) as HTMLDivElement;

  let currentTab: Tab | null = null;

  const el = (
    <div class={style.exploreRoute}>
      <div class={style.notices}>
        <Notice
          type="info"
          description={t`A listing can be bumped once every 3 hours. All bumps reset every Monday at 0:00 UTC.`}
        />
        <Notice
          type="warn"
          description={t`Please report bots that are malicious, broken themes or servers that break the TOS.`}
        />
      </div>
      <Tabs />
      {tabContent}
    </div>
  ) as HTMLDivElement;

  const joinServerClick = async (e: MouseEvent) => {
    const serverEl = closestFromEvent(e, "[data-server-id]");
    if (serverEl) {
      const serverId = serverEl.dataset.serverId!;
      const label = serverEl.querySelector(".label");
      if (!label) return;
      label.textContent = `Joining...`;
      const [, error] = await serverStore.joinServer(serverId);
      if (error?.message) {
        label.textContent = `Join Server`;
        alert({ message: error.message });
      }
    }
  };

  const applyThemeClick = async (e: MouseEvent) => {
    const themeEl = closestFromEvent(e, `.${style.themeItem}`);
    const theme = elToExploreTheme.get(themeEl!);
    if (!theme) return;
    updateTheme(theme.colors);
  };

  el.addEventListener(
    "click",
    async (e) => {
      const actionEl = closestFromEvent(e, "[data-action]");
      if (actionEl) {
        const action = actionEl.dataset.action;
        if (action === "join") {
          joinServerClick(e);
        }

        if (action === "apply-theme") {
          applyThemeClick(e);
        }
      }
    },
    { signal },
  );

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

  let tabAc = new AbortController();

  const updateTab = (tab: Tab) => {
    if (tab == currentTab) return;
    currentTab = tab;
    const tabs = el.querySelectorAll<HTMLDivElement>(`.item`);

    tabs.forEach((tabEl) => {
      tabEl.dataset.selected = tabEl.dataset.tab === tab ? "true" : "false";
    });

    tabAc.abort();
    tabAc = new AbortController();
    const { signal } = tabAc;
    tabContent.replaceChildren();
    if (tab === "all") AllTab({ tabContent, signal });
    if (tab === "servers") ServersTab({ tabContent, signal });
    if (tab === "bots") BotsTab({ tabContent, signal });
    if (tab === "themes") ThemesTab({ tabContent, signal });
  };

  const render = () => {
    if (signal.aborted) return;
    if (currentTab) return;
    if (!accountStore.authenticated) return;
    content.replaceChildren(el);

    router.createMatchListener<{ tab: string }>(
      "/app/explore{/:tab}?",
      (res) => {
        if (!res) return;
        const tab = res?.params?.tab as Tab;
        updateTab(tab || "all");
      },
      { signal },
    );
  };

  render();
  storeEmitter.on("ws:authStateUpdate", render, signal);

  const destroy = () => {
    ac.abort();
    tabAc.abort();
    hoverAnimator.destroy();
    el.remove();
  };

  return { destroy };
};

const AllTab = ({
  tabContent,
  signal,
}: {
  tabContent: HTMLDivElement;
  signal: AbortSignal;
}) => {
  (async () => {
    tabContent.replaceChildren();
    const skeletons = [
      (<ListSkeleton />) as HTMLElement,
      (<ListSkeleton />) as HTMLElement,
      (<ListSkeleton />) as HTMLElement,
      (<ListSkeleton />) as HTMLElement,
    ];
    const [pinnedSkeleton, serversSkeleton, botsSkeleton, themesSkeleton] =
      skeletons as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];
    tabContent.append(...skeletons);
    const clearSkeletons = () => skeletons.forEach((s) => s.remove());

    const [pinnedServers] = await getExploreItems({
      type: "server",
      filter: "pinned",
      sort: "pinned_at",
    });
    if (signal.aborted) return;
    if (!pinnedServers) return clearSkeletons();
    pinnedSkeleton.replaceWith(
      <HorizList hideShowAll name={t`Pinned Servers`} items={pinnedServers} />,
    );
    const [servers] = await getExploreItems({
      type: "server",
      filter: "all",
      sort: "most_active",
      limit: 6,
    });
    if (signal.aborted) return;
    if (!servers) return clearSkeletons();

    serversSkeleton.replaceWith(
      <HorizList name={t`Bumped Servers`} items={servers} href="./servers" />,
    );
    const [bots] = await getExploreItems({
      type: "bot",
      filter: "all",
      sort: "recently_bumped",
      limit: 6,
    });
    if (signal.aborted) return;
    if (!bots) return clearSkeletons();
    botsSkeleton.replaceWith(
      <HorizList name={t`Bumped Bots`} items={bots} href="./bots" />,
    );

    const themes = await getExploreThemesArray();
    if (signal.aborted) return;
    if (!themes) return clearSkeletons();
    themesSkeleton.replaceWith(
      <HorizList name={t`Recent Themes`} themes={themes} href="./themes" />,
    );
  })();
};

const ThemesTab = ({
  tabContent,
  signal,
}: {
  tabContent: HTMLDivElement;
  signal: AbortSignal;
}) => {
  (async () => {
    tabContent.replaceChildren();
    const skeleton = (<ListSkeleton grid name count={10} />) as HTMLElement;
    tabContent.append(skeleton);

    const themes = await getExploreThemesArray();
    if (signal.aborted) return;
    if (!themes) return skeleton.remove();

    skeleton.replaceWith(
      <div class={style.gridListContainer}>
        <div class={style.gridList}>
          {themes.map((theme) => (
            <ThemeItem item={theme} />
          ))}
        </div>
      </div>,
    );
  })();
};

const PAGE_SIZE = 12;

const renderExploreItem = (item: RawExploreItem) =>
  item.server ? (
    <ServerItem item={item} />
  ) : item.botApplication ? (
    <BotItem item={item} />
  ) : null;

const GridList = (props: { name?: string; items: RawExploreItem[] }) => {
  return (
    <div class={style.gridListContainer}>
      {props.name && <div class={style.title}>{props.name}</div>}
      <div class={style.gridList}>{props.items.map(renderExploreItem)}</div>
    </div>
  );
};

const ServerFilters = () =>
  [
    {
      id: "all",
      name: t`All`,
    },
    {
      id: "verified",
      name: t`Verified`,
    },
    {
      id: "clans",
      name: t`Clans`,
    },
  ] as const;
const ServerSorts = () =>
  [
    {
      id: "most_bumps",
      name: t`Most Bumps`,
    },
    {
      id: "most_members",
      name: t`Most Members`,
    },
    {
      id: "recently_added",
      name: t`Recently Added`,
    },
    {
      id: "recently_bumped",
      name: t`Recently Bumped`,
    },
    {
      id: "most_active",
      name: t`Most Active`,
    },
  ] as const;

interface ExploreListTabOpts {
  tabContent: HTMLDivElement;
  signal: AbortSignal;
  type: "server" | "bot";
  sorts: () => readonly { id: string; name: string }[];
  filters: () => readonly { id: string; name: string }[];
  defaultSort: PublicServerSort;
  defaultFilter: PublicServerFilter;
  searchPlaceholder: string;
  showPinned?: boolean;
}

const ExploreListTab = ({
  tabContent,
  signal,
  type,
  sorts,
  filters,
  defaultSort,
  defaultFilter,
  searchPlaceholder,
  showPinned,
}: ExploreListTabOpts) => {
  (async () => {
    tabContent.replaceChildren();
    const pinnedSkeleton = showPinned
      ? ((<ListSkeleton grid name count={2} />) as HTMLElement)
      : undefined;
    const serversSkeleton = (<ListSkeleton grid count={10} />) as HTMLElement;

    let sortId: PublicServerSort = defaultSort;
    let filterId: PublicServerFilter = defaultFilter;

    const sortDropdown = Dropdown.create({
      signal,
      initialSelectedId: () => sortId,
      onChange(id) {
        sortId = id as PublicServerSort;
        updatePinnedVisibility();
        reloadServers();
      },
      items() {
        return sorts().map((filter) => (
          <Dropdown.Item id={filter!.id}>
            <Dropdown.Label>{filter!.name}</Dropdown.Label>
          </Dropdown.Item>
        ));
      },
    });
    const filterDropdown = Dropdown.create({
      signal,
      initialSelectedId: () => filterId,
      onChange(id) {
        filterId = id as PublicServerFilter;
        updatePinnedVisibility();
        reloadServers();
      },
      items() {
        return filters().map((filter) => (
          <Dropdown.Item id={filter!.id}>
            <Dropdown.Label>{filter!.name}</Dropdown.Label>
          </Dropdown.Item>
        ));
      },
    });

    let inputVal = "";
    const filterArea = (
      <div class={style.filterArea}>
        <Input
          prefix={<Icon class={style.searchIcon} name="search" />}
          class={style.searchInput}
          placeholder={searchPlaceholder}
        />
        {sortDropdown.el}
        {filterDropdown.el}
      </div>
    ) as HTMLDivElement;

    const searchInput = filterArea.querySelector(`input`) as HTMLInputElement;

    tabContent.append(filterArea, serversSkeleton);

    let pinnedEl: HTMLElement | undefined;
    const updatePinnedVisibility = () => {
      if (!pinnedEl) return;
      const isDefault =
        sortId === defaultSort && filterId === defaultFilter && !inputVal;
      pinnedEl.style.display = isDefault ? "" : "none";
    };

    if (pinnedSkeleton) {
      filterArea.after(pinnedSkeleton);
      (async () => {
        const [pinnedServers] = await getExploreItems({
          type: "server",
          filter: "pinned",
          sort: "pinned_at",
        });
        if (signal.aborted) return;
        if (!pinnedServers) return pinnedSkeleton.remove();
        const el = (
          <GridList name={t`Pinned Servers`} items={pinnedServers} />
        ) as HTMLElement;
        pinnedSkeleton.replaceWith(el);
        pinnedEl = el;
        updatePinnedVisibility();
      })();
    }

    const fetchServers = (afterId?: string) =>
      getExploreItems({
        type,
        filter: filterId,
        sort: sortId,
        limit: PAGE_SIZE,
        search: inputVal,
        afterId,
      });

    const grid = (<div class={style.gridList}></div>) as HTMLDivElement;
    const gridContainer = (
      <div class={style.gridListContainer}>{grid}</div>
    ) as HTMLDivElement;

    let lastId: string | undefined;
    let hasMore = true;
    let generationAc: AbortController | undefined;
    let currentSkeleton: HTMLElement | undefined;

    const appendItems = (items: RawExploreItem[]) => {
      hasMore = items.length >= PAGE_SIZE;
      lastId = items.at(-1)?.id ?? lastId;
      grid.append(...items.map(renderExploreItem).filter((el) => el !== null));
    };

    const loadPage = async (
      afterId: string | undefined,
      genSignal: AbortSignal,
    ) => {
      const pageAc = new AbortController();
      genSignal.addEventListener("abort", () => pageAc.abort(), { once: true });

      const skeletons = Array.from({ length: 10 }, () => (
        <ItemSkeleton />
      )) as HTMLElement[];
      grid.append(...skeletons);

      let loading = false;
      createIntersectionObserver(
        skeletons[0]! as HTMLDivElement,
        null,
        async () => {
          if (loading) return;
          loading = true;
          const [items] = await fetchServers(afterId);
          if (signal.aborted || genSignal.aborted) return;
          pageAc.abort();
          skeletons.forEach((s) => s.remove());
          if (!items) return;
          appendItems(items);
          if (hasMore) loadPage(lastId, genSignal);
        },
        { signal: pageAc.signal, rootMargin: "200px" },
      );
    };

    const showLoading = () => {
      generationAc?.abort();
      lastId = undefined;
      hasMore = true;
      grid.replaceChildren();
      if (currentSkeleton?.isConnected) return;
      currentSkeleton = (<ListSkeleton grid count={10} />) as HTMLElement;
      gridContainer.replaceWith(currentSkeleton);
      if (!currentSkeleton.isConnected) tabContent.append(currentSkeleton);
    };

    const reloadServers = async () => {
      showLoading();
      const skeleton = currentSkeleton!;
      const ac = (generationAc = new AbortController());

      const [servers] = await fetchServers();
      if (signal.aborted || ac.signal.aborted) return;
      if (!servers) return skeleton.remove();

      skeleton.replaceWith(gridContainer);
      appendItems(servers);
      if (hasMore) loadPage(lastId, ac.signal);
    };

    signal.addEventListener("abort", () => generationAc?.abort(), {
      once: true,
    });

    const debouncedReloadServers = debounce(reloadServers, 800);
    searchInput.addEventListener(
      "input",
      () => {
        inputVal = searchInput.value;
        updatePinnedVisibility();
        showLoading();
        debouncedReloadServers();
      },
      { signal },
    );

    serversSkeleton.replaceWith(gridContainer);
    reloadServers();
  })();
};

const BotFilters = () =>
  [
    {
      id: "all",
      name: t`All`,
    },
    {
      id: "online_bots",
      name: t`Online`,
    },
    {
      id: "offline_bots",
      name: t`Offline`,
    },
  ] as const;
const BotSorts = () =>
  [
    {
      id: "most_bumps",
      name: t`Most Bumps`,
    },
    {
      id: "most_members",
      name: t`Most Members`,
    },
    {
      id: "recently_added",
      name: t`Recently Added`,
    },
    {
      id: "recently_bumped",
      name: t`Recently Bumped`,
    },
  ] as const;

const ServersTab = (opts: {
  tabContent: HTMLDivElement;
  signal: AbortSignal;
}) =>
  ExploreListTab({
    ...opts,
    type: "server",
    sorts: ServerSorts,
    filters: ServerFilters,
    defaultSort: "recently_bumped",
    defaultFilter: "all",
    searchPlaceholder: t`Search servers...`,
    showPinned: true,
  });

const BotsTab = (opts: { tabContent: HTMLDivElement; signal: AbortSignal }) =>
  ExploreListTab({
    ...opts,
    type: "bot",
    sorts: BotSorts,
    filters: BotFilters,
    defaultSort: "recently_bumped",
    defaultFilter: "online_bots",
    searchPlaceholder: t`Search bots...`,
  });

export default createExploreRoute;
