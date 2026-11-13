import { isMobileWidth } from "../../config";
import { closestFromEvent } from "../../utils/dom";
import { portalElement } from "../../utils/portal";
import { Icon } from "../icon";
import { createModal, Modal } from "./modal";

import style from "./ContextMenu.module.css";

const Root = (props: {
  children: any;
  pos: { x: string; y: string };
  id?: string;
}) => {
  return (
    <Modal.Root pos={props.pos}>
      <div class={style.contextMenu} id={props.id}>
        {props.children}
      </div>
    </Modal.Root>
  );
};
const SubmenuRoot = (props: {
  children: any;
  pos: { x: string; y: string };
}) => {
  return (
    <Modal.Root pos={props.pos}>
      <div class={[style.contextMenu, "submenu", style.submenu]}>
        {props.children}
      </div>
    </Modal.Root>
  );
};

const ItemIcon = (props: { name: string }) => {
  return <Icon name={props.name} class={style.icon} />;
};

const RightArrowIcon = () => {
  return <Icon name="chevron_right" class={[style.icon, style.rightArrow]} />;
};

const ItemLabel = (props: { children: any }) => {
  return <div class={style.label}>{props.children}</div>;
};

const Item = (props: {
  children: any;
  alert?: boolean;
  id?: string;
  selected?: boolean;
  disabled?: boolean;
  disableCloseOnClick?: boolean;
  class?: any;
}) => {
  return (
    <div
      class={[style.item, "ctx-item", props.class]}
      data-alert={props.alert}
      data-selected={props.selected}
      data-disabled={props.disabled}
      data-disable-close-click={props.disableCloseOnClick}

      id={props.id}
    >
      {props.children}
    </div>
  );
};

const Separator = () => {
  return <div class={style.separator} />;
};

interface Submenu<T> {
  id: string;
  render: (props: { data: T; pos: { x: string; y: string } }) => JSX.Element;
}

type ContextMenuHandlerConfig<TData> = {
  el?: HTMLElement;
  signal: AbortSignal;
  selector: string;
  idSelector?: string;
  attr: string;
  shouldSkip?: (target: HTMLElement) => boolean;
  resolveData: (
    id: string,
    element: HTMLDivElement,
  ) => TData | null | undefined;
  renderMenu: (props: {
    id: string;
    data: TData;
    x: string;
    y: string;
    signal: AbortSignal;
  }) => JSX.Element;
  submenus?: Array<Submenu<TData>>;
  onAction: (
    actionId: string,
    ctx: {
      id: string;
      data: TData;
      event: MouseEvent;
      element: HTMLDivElement;
    },
  ) => void;
  mode?: "contextmenu" | "click" | "manual";
};

const createHandler = <TData,>(config: ContextMenuHandlerConfig<TData>) => {
  const el = config.el ?? document.body;
  let abortController: AbortController | null = null;

  const getSubmenuById = (id: string) =>
    config.submenus?.find((m) => m.id === id);

  config.signal.addEventListener(
    "abort",
    () => {
      abortController?.abort();
      abortController = null;
    },
    { once: true },
  );

  const open = (event: MouseEvent, target = event.target as HTMLElement) => {
    if (config.shouldSkip?.(target)) {
      event.preventDefault();
      return;
    }

    const matchEl = target.closest(config.selector) as HTMLElement | null;
    if (!matchEl) return;

    let id = matchEl.dataset?.[config.attr];

    if (config.idSelector) {
      const idEl = target.closest(config.idSelector) as HTMLElement | null;
      if (idEl) {
        id = idEl.dataset?.[config.attr] ?? id;
      }
    }

    if (!id) return;

    event.preventDefault();
    event.stopPropagation();

    const data = config.resolveData(id, matchEl as HTMLDivElement);
    if (data == null) return;

    abortController?.abort();
    abortController = new AbortController();
    const currentSignal = abortController.signal;

    let lastHoveredId: null | string = null;

    portalElement().addEventListener(
      "mouseover",
      (e: MouseEvent) => {
        if (isMobileWidth()) return;
        const item = closestFromEvent(e, ".ctx-item");

        const actionId = item?.id;
        if (!item || !actionId) return;

        const submenuEl = closestFromEvent(e, ".submenu");
        const submenuId = submenuEl?.dataset.id!;

        if (submenuId) return;

        if (lastHoveredId === actionId) return;
        lastHoveredId = actionId;

        submenuAc.abort();

        const submenu = getSubmenuById(actionId);
        if (!submenu) return;

        createSubmenu(data, submenu, currentSignal, item);
      },
      {
        signal: currentSignal,
      },
    );

    portalElement().addEventListener(
      "click",
      (e: MouseEvent) => {
        const item = closestFromEvent(e, ".ctx-item");
        const actionId = item?.id;

        const submenu = getSubmenuById(actionId!);

        if (submenu) {
          if (item) createSubmenu(data, submenu, currentSignal, item);

          return;
        }

        if (!closestFromEvent(e, `[data-disable-close-click="true"]`)) {
          if (item && abortController) {
            abortController.abort("menu_closed");
            abortController = null;
          }
        }

        if (!actionId) return;
        config.onAction(actionId, {
          id,
          data,
          event: e,
          element: matchEl as HTMLDivElement,
        });
      },
      { signal: currentSignal },
    );

    createModal(
      () =>
        config.renderMenu({
          id,
          data,
          x: `${event.clientX}px`,
          y: `${event.clientY}px`,
          signal: currentSignal,
        }),
      abortController,
    );
  };

  if (config.mode !== "manual") {
    el.addEventListener(config.mode ?? "contextmenu", open, {
      signal: config.signal,
    });
  }

  return open;
};

let submenuAc = new AbortController();

export const createSubmenu = (
  data: NonNullable<any>,
  submenu: Submenu<any>,
  mainContextSignal: AbortSignal,
  trigger: HTMLElement,
) => {
  submenuAc.abort();
  submenuAc = new AbortController();

  if (mainContextSignal.aborted) return;
  requestAnimationFrame(() => {
    const triggerRect = trigger.getBoundingClientRect();
    const submenuEl = submenu.render({
      data,
      pos: {
        x: `${triggerRect.right}px`,
        y: `${triggerRect.top}px`,
      },
    }) as HTMLDivElement;

    submenuEl.classList.add(style.submenuModalRoot!);
    (submenuEl.firstChild!.firstChild! as HTMLDivElement).dataset.id =
      submenu.id;

    createModal(() => submenuEl, submenuAc);

    mainContextSignal.addEventListener(
      "abort",
      () => {
        submenuAc.abort();
      },
      { once: true },
    );
  });
};

export const ContextMenu = {
  createHandler,
  Root,
  SubmenuRoot,
  Icon: ItemIcon,
  RightArrowIcon,
  Item,
  Label: ItemLabel,
  Separator,
};
