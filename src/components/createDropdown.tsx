import { portalElement } from "../utils/portal";
import { Icon } from "./icon";

import style from "./createDropdown.module.css";

const createDropdown = (opts: { signal: AbortSignal; items: () => any }) => {
  let popupEl: HTMLDivElement | null = null;

  const el = (
    <div>
      <DropdownItem _main>
        <Dropdown.Label>Test</Dropdown.Label>
      </DropdownItem>
    </div>
  ) as HTMLDivElement;

  const buildPopup = () => {
    return (
      <div class={style.dropdownPopup}>{opts.items()}</div>
    ) as HTMLDivElement;
  };

  document.addEventListener(
    "click",
    (event) => {
      if (popupEl) {
        popupEl.remove();
        popupEl = null;
        return;
      }

      const target = event.target as HTMLDivElement;
      const mainEl = target.closest(`.${style.main}`);
      if (mainEl?.parentElement != el) return;

      popupEl = buildPopup();

      const mainRect = el.getBoundingClientRect();

      popupEl.style.top = `${mainRect.top + mainRect.height}px`;
      popupEl.style.left = `${mainRect.left}px`;
      popupEl.style.minWidth = `${mainRect.width}px`;

      portalElement().appendChild(popupEl);
    },
    { signal: opts.signal },
  );

  opts.signal.addEventListener(
    "abort",
    () => {
      popupEl?.remove();
      popupEl = null;
    },
    { once: true },
  );

  return el;
};

const DropdownItem = (props: { _main?: boolean; children: any }) => {
  return (
    <div class={[style.item, props._main && style.main]}>
      {props.children}
      {props._main && (
        <Icon class={style.expandIcon} name="keyboard_arrow_down" />
      )}
    </div>
  );
};

export const Dropdown = {
  create: createDropdown,
  Item: DropdownItem,
  Label: (props: { children: any }) => <div>{props.children}</div>,
};
