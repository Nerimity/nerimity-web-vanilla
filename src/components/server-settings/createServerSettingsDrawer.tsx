import { t } from "@lingui/core/macro";
import { matchSorter } from "match-sorter";
import morphdom from "morphdom";

import {
  ServerSettings,
  type ServerSetting,
} from "../../pages/app-page/server-settings/ServerSettings";
import { serverStore } from "../../store/serverStore";
import { router } from "../../utils/router";
import { Drawer } from "../drawer";
import { Icon } from "../icon";
import { Input } from "../input";
import { Item } from "../item";
import { Pill } from "../Pill";

import style from "./createServerSettingsDrawer.module.css";

const HeaderPill = () => {
  return <Pill icon="settings" label={t`Settings`} />;
};

const createItemHelper = () => {
  const create = (props: { setting: ServerSetting }) => {
    const serverId = serverStore.currentServerId;

    let basePath = `/app/servers/${serverId}/settings`;

    const fullPath = basePath + props.setting.path;
    const fullPatternPath =
      basePath + (props.setting.pattern || props.setting.path);
    return (
      <Item.Base
        class={style.item}
        data-id={props.setting.id}
        href={fullPath}
        selected={!!router.match(fullPatternPath)}
      >
        <Item.Icon name={props.setting.icon} />
        <Item.Label>{props.setting.name()}</Item.Label>
      </Item.Base>
    );
  };

  const updateSelected = (container: HTMLElement, id: string) => {
    const selected = container.querySelector(
      `.${style.item}[data-selected="true"]`,
    );

    if (selected) {
      selected.setAttribute("data-selected", "false");
    }

    const item = container.querySelector(`.${style.item}[data-id="${id}"]`);

    item?.setAttribute("data-selected", "true");
  };

  return {
    updateSelected,
    create,
  };
};

const itemHelper = createItemHelper();

export const createServerSettingsDrawer = () => {
  const ac = new AbortController();
  const { signal } = ac;

  let listEl = (<div class={style.list}></div>) as HTMLDivElement;

  let containerEl = (
    <div class={style.outerContainer}>
      <div class={style.headerBackdrop}></div>
      <div class={[style.container, "scrollbarHover"]}>
        <div class={style.header}>
          <HeaderPill />
        </div>
        <Input
          id="searchSettings"
          prefix={<Icon class={style.searchIcon} name="search" />}
          class="searchInput"
          placeholder="Search Settings"
        />

        {listEl}
      </div>
    </div>
  ) as HTMLDivElement;

  containerEl.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLDivElement;

      if (target.closest(`.${style.item}`)) {
        Drawer().updatePage({ page: 1 });
      }
    },
    { signal },
  );

  let searchInputEl = containerEl.querySelector(
    ".searchInput input",
  ) as HTMLInputElement;

  const renderList = () => {
    const val = searchInputEl.value;

    const SettingsWithoutHidden = ServerSettings.filter(
      (s) => !s.hideFromDrawer,
    );

    const results = matchSorter(SettingsWithoutHidden, val, {
      keys: [
        (item) => item.name(),
        (item) => Object.values(item.load.getStrings()),
      ],
    }).sort(
      (a, b) =>
        SettingsWithoutHidden.indexOf(a) - SettingsWithoutHidden.indexOf(b),
    );

    morphdom(
      listEl,
      <div>{results.map((s) => itemHelper.create({ setting: s }))}</div>,
      { childrenOnly: true },
    );
  };
  renderList();

  searchInputEl.addEventListener("input", renderList, { signal });

  const render = () => {
    return containerEl;
  };

  router.createMatchListener(
    "/app/servers/:serverId/settings/*",
    () => {
      const matchedRoute = ServerSettings.find((s) =>
        router.match("/app/servers/:serverId/settings" + (s.pattern || s.path)),
      );
      if (!matchedRoute) return;
      itemHelper.updateSelected(listEl, matchedRoute.id);
      renderList();
    },
    { signal, always: true },
  );

  const destroy = () => {
    ac.abort();
    listEl.remove();
    (listEl as any) = null;

    containerEl?.remove();
    (containerEl as any) = null;
    (searchInputEl as any) = null;
  };

  return {
    destroy,
    render,
  };
};
