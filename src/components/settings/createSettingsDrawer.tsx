import { t } from "@lingui/core/macro";

import { h } from "../../h";
import {
  Settings,
  type Setting,
} from "../../pages/app-page/settings/createSettingsRoute";
import { router } from "../../utils/router";
import { Item } from "../item";
import { Pill } from "../Pill";

import style from "./createSettingsDrawer.module.css";

const HeaderPill = () => {
  return <Pill icon="settings" label={t`Settings`} />;
};

const createItemHelper = () => {
  const create = (props: { setting: Setting }) => {
    const fullPath = "/app/settings" + props.setting.path;
    return (
      <Item.Base
        class={style.item}
        data-id={props.setting.id}
        href={fullPath}
        selected={!!router.match(fullPath)}
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

export const createSettingsDrawer = () => {
  const ac = new AbortController();
  const { signal } = ac;

  let listEl = (
    <div class={style.list}>
      {Settings.map((s) => itemHelper.create({ setting: s }))}
    </div>
  ) as HTMLDivElement;

  let containerEl = (
    <div class={style.outerContainer}>
      <div class={style.headerBackdrop}></div>
      <div class={[style.container, "scrollbarHover"]}>
        <div class={style.header}>
          <HeaderPill />
        </div>

        {listEl}
      </div>
    </div>
  ) as HTMLDivElement;

  const render = () => {
    return containerEl;
  };

  router.createMatchListener(
    "/app/settings/*",
    () => {
      const matchedRoute = Settings.find((s) =>
        router.match("/app/settings" + s.path),
      );
      if (!matchedRoute) return;
      itemHelper.updateSelected(listEl, matchedRoute.id);
    },
    { signal, always: true },
  );

  const destroy = () => {
    ac.abort();
    listEl.remove();
    (listEl as any) = null;

    containerEl?.remove();
    (containerEl as any) = null;
  };

  return {
    destroy,
    render,
  };
};
