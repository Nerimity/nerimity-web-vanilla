import { portalElement } from "../utils/portal";
import { Icon } from "./icon";
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

const ItemIcon = (props: { name: string }) => {
  return <Icon name={props.name} class={style.icon} />;
};
const ItemLabel = (props: { children: any }) => {
  return <div class={style.label}>{props.children}</div>;
};

const Item = (props: {
  children: any;
  alert?: boolean;
  id?: string;
  selected?: boolean;
}) => {
  return (
    <div
      class={[style.item, "ctx-item"]}
      data-alert={props.alert}
      data-selected={props.selected}
      id={props.id}
    >
      {props.children}
    </div>
  );
};

const Separator = () => {
  return <div class={style.separator} />;
};

type ContextMenuHandlerConfig<TData> = {
  el?: HTMLElement;
  signal: AbortSignal;
  selector: string;
  attr: string;
  shouldSkip?: (target: HTMLElement) => boolean;
  resolveData: (id: string) => TData | null | undefined;
  renderMenu: (props: {
    id: string;
    data: TData;
    x: string;
    y: string;
  }) => JSX.Element;
  onAction: (
    actionId: string,
    ctx: { id: string; data: TData; event: MouseEvent },
  ) => void;
  mode?: "contextmenu" | "click";
};

const createHandler = <TData,>(config: ContextMenuHandlerConfig<TData>) => {
  const el = config.el ?? document.body;
  let abortController: AbortController | null = null;

  config.signal.addEventListener(
    "abort",
    () => {
      abortController?.abort();
      abortController = null;
    },
    { once: true },
  );

  el.addEventListener(
    config.mode ?? "contextmenu",
    (event) => {
      const target = event.target as HTMLElement;
      if (config.shouldSkip?.(target)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const matchEl = target.closest(config.selector) as HTMLElement | null;
      if (!matchEl) return;

      const id = matchEl.dataset?.[config.attr];
      if (!id) return;

      event.preventDefault();
      event.stopPropagation();

      const data = config.resolveData(id);
      if (data == null) return;

      abortController?.abort();
      abortController = new AbortController();
      const currentSignal = abortController.signal;

      portalElement().addEventListener(
        "click",
        (e: MouseEvent) => {
          const clickTarget = e.target as HTMLElement;
          const item = clickTarget?.closest(".ctx-item");
          const actionId = item?.id;

          if (abortController) {
            abortController.abort("menu_closed");
            abortController = null;
          }

          if (!actionId) return;
          config.onAction(actionId, { id, data, event: e });
        },
        { signal: currentSignal, once: true },
      );

      createModal(
        () =>
          config.renderMenu({
            id,
            data,
            x: `${event.clientX}px`,
            y: `${event.clientY}px`,
          }),
        abortController,
      );
    },
    { signal: config.signal },
  );
};

export const ContextMenu = {
  createHandler,
  Root,
  Icon: ItemIcon,
  Item,
  Label: ItemLabel,
  Separator,
};
