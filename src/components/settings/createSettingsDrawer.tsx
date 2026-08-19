import { t } from "@lingui/core/macro";

import { h } from "../../h";
import { Pill } from "../Pill";

import style from "./createSettingsDrawer.module.css";

const HeaderPill = () => {
  return <Pill icon="settings" label={t`Settings`} />;
};

export const createSettingsDrawer = () => {
  let listEl = (<div class={style.list}></div>) as HTMLDivElement;

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

  const destroy = () => {
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

// const createItemHelper = () => {
//   const create = () => {
//     return (
//       <Item.Base>
//         <Item.Label>test</Item.Label>
//       </Item.Base>
//     );
//   };

//   const updateSelected = (container: HTMLElement, channelId: string) => {
//     const selected = container.querySelector(
//       `.${style.channelItem}[data-selected="true"]`,
//     );

//     if (selected) {
//       selected.setAttribute("data-selected", "false");
//     }

//     const item = container.querySelector(
//       `.${style.channelItem}[data-channel-id="${channelId}"]`,
//     );

//     item?.setAttribute("data-selected", "true");
//   };

//   return {
//     updateSelected,
//     create,
//   };
// };

// const itemHelper = createItemHelper();
