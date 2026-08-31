import { Icon } from "./icon";
import { createModal, Modal } from "./modal";

import style from "./createDropdown.module.css";

const createDropdown = (opts: {
  signal: AbortSignal;
  initialSelectedId: () => string;
  items: () => any[];
  onChange: (id: string) => void;
}) => {
  let popupEl: HTMLDivElement | null = null;

  const mainContainer = (<div class={style.main}></div>) as HTMLDivElement;

  const el = (<div>{mainContainer}</div>) as HTMLDivElement;

  const selectedId = opts.initialSelectedId;
  const selectedIdToIndex = () =>
    opts
      .items()
      .findIndex((item: HTMLDivElement) => item.dataset.id === selectedId());

  const rerenderSelected = () => {
    mainContainer.replaceChildren(opts.items()[selectedIdToIndex()] ?? []);
  };

  rerenderSelected();

  const buildPopup = () => {
    return (
      <div class={style.dropdownPopup}>{opts.items()}</div>
    ) as HTMLDivElement;
  };

  let popupAc: AbortController | null = null;
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;

      if (popupEl && popupEl.contains(target)) {
        const clickedPopupEl = target.closest(
          `.${style.item}`,
        ) as HTMLDivElement;
        if (clickedPopupEl) {
          opts.onChange(clickedPopupEl.dataset.id!);
          rerenderSelected();
          popupAc?.abort();
        }
        return;
      }

      const mainEl = target.closest(`.${style.main}`);
      if (mainEl?.parentElement !== el) return;

      popupEl = buildPopup();

      const mainRect = el.getBoundingClientRect();

      popupEl.style.minWidth = `${mainRect.width}px`;

      const selectedEl = popupEl.querySelector(
        `[data-id="${selectedId()}"]`,
      ) as HTMLDivElement;
      if (selectedEl) {
        selectedEl.dataset.selected = "true";

        requestAnimationFrame(() => {
          const modalRoot = selectedEl.closest(".modalRoot") as HTMLDivElement;
          if (!modalRoot || !popupEl) return;

          selectedEl.scrollIntoView({ block: "center" });

          const itemRect = selectedEl.getBoundingClientRect();
          const popupRect = popupEl.getBoundingClientRect();

          const offsetInPopup = itemRect.top - popupRect.top;
          let newY = mainRect.top - offsetInPopup;

          const padding = 8;
          const popupHeight = popupRect.height;

          if (newY < padding) newY = padding;
          if (newY + popupHeight > window.innerHeight - padding) {
            newY = window.innerHeight - padding - popupHeight;
          }

          modalRoot.style.setProperty("--y", `${newY}px`);
          popupEl.style.visibility = "visible";
        });
      }

      popupAc = new AbortController();

      createModal(
        () => (
          <Modal.Root
            pos={{
              x: `${mainRect.left}px`,
              y: `${mainRect.top + mainRect.height}px`,
            }}
          >
            {popupEl}
          </Modal.Root>
        ),
        popupAc,
      );
    },
    { signal: opts.signal },
  );

  opts.signal.addEventListener(
    "abort",
    () => {
      popupAc?.abort();
      popupEl?.remove();
      popupEl = null;
    },
    { once: true },
  );

  return { el, update: rerenderSelected };
};

const DropdownItem = (props: { children: any; id: string }) => {
  return (
    <div class={style.item} data-id={props.id}>
      {props.children}
      <Icon class={style.expandIcon} name="keyboard_arrow_down" />
    </div>
  );
};

export const Dropdown = {
  create: createDropdown,
  Item: DropdownItem,
  Label: (props: { children: any }) => <div>{props.children}</div>,
};
