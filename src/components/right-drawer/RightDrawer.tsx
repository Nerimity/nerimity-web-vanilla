import { t } from "@lingui/core/macro";

import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";
import { Icon } from "../icon";
import { createFilesDrawer } from "./FilesDrawer";
import { createInboxInfoDrawer } from "./InboxInfoDrawer";
import { createServerInfoDrawer } from "./ServerInfoDrawer";

import style from "./RightDrawer.module.css";

const Tab = (props: { id: string; title?: string; icon: string }) => {
  return (
    <button class={style.tab} data-id={props.id}>
      <Icon class={style.icon} name={props.icon} />
      <div class={style.title}>{props.title}</div>
    </button>
  );
};

const Tabs = () => {
  return (
    <div class={style.tabs}>
      <Tab id="info" icon="info" title={t`Info`} />
      <Tab id="files" icon="attach_file" title={t`Files`} />
      <Tab id="search" icon="search" title={t`Search`} />
    </div>
  );
};

type Tab = "info" | "files" | "search";

export const createRightDrawer = () => {
  let currentTabContent: undefined | ReturnType<typeof createServerInfoDrawer> =
    undefined;

  let currentTab: Tab = "info";
  let innerContainerEl = (<div></div>) as HTMLDivElement;
  let tabsEl = (<Tabs />) as HTMLDivElement;
  let containerEl = (
    <div class={[style.memberListContainer, "scrollbarHover"]}>
      {tabsEl}
      {innerContainerEl}
    </div>
  ) as HTMLDivElement;

  const ac = new AbortController();
  const { signal } = ac;

  const updateTab = () => {
    currentTabContent?.destroy();
    currentTabContent = undefined;

    if (currentTab === "info") {
      currentTabContent = serverStore.currentServerId
        ? createServerInfoDrawer({ containerEl })
        : createInboxInfoDrawer();
      innerContainerEl.replaceChildren(currentTabContent.render());
    }
    if (currentTab === "files") {
      currentTabContent = createFilesDrawer();
      innerContainerEl.replaceChildren(currentTabContent.render());
    }
    const tabs = tabsEl.querySelectorAll(`[data-id]`);
    tabs.forEach((t) => {
      const target = t as HTMLDivElement;
      target.dataset.active = String(target.dataset.id === currentTab);
    });
  };
  updateTab();

  tabsEl.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const tabEl = target.closest("[data-id]") as HTMLDivElement;
      if (!tabEl) return;
      const id = tabEl.dataset.id as Tab;
      if (currentTab === id) return;
      currentTab = id;
      updateTab();
    },
    { signal },
  );

  const render = () => {
    return containerEl;
  };

  storeEmitter.on(
    "navigate:channelId",
    () => {
      if (currentTab === "info") return;
      currentTab = "info";
      updateTab();
    },
    signal,
  );

  const destroy = () => {
    ac.abort();
    tabsEl?.remove();
    currentTabContent?.destroy();
    innerContainerEl?.remove();
    containerEl?.remove();

    (tabsEl as any) = null;
    (innerContainerEl as any) = null;
    (containerEl as any) = null;
  };

  return {
    destroy,
    render,
  };
};
