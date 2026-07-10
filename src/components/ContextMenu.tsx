import { h } from "../h";
import { Icon } from "./icon";
import { Modal } from "./modal";

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

const Item = (props: { children: any; alert?: boolean; id?: string }) => {
  return (
    <div
      class={[style.item, "ctx-item"]}
      data-alert={props.alert}
      id={props.id}
    >
      {props.children}
    </div>
  );
};

const Separator = () => {
  return <div class={style.separator} />;
};

export const ContextMenu = {
  Root,
  Icon: ItemIcon,
  Item,
  Label: ItemLabel,
  Separator,
};
