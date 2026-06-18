import { h } from "../../h";
import { Icon } from "../icon";
import { Modal } from "../modal";

import style from "./ContextMenu.module.css";

const Root = (props: { children: any; pos: { x: string; y: string } }) => {
  return (
    <Modal.Root pos={props.pos}>
      <div class={style.contextMenu}>{props.children}</div>
    </Modal.Root>
  );
};

const ItemIcon = (props: { name: string }) => {
  return <Icon name={props.name} class={style.icon} />;
};
const ItemLabel = (props: { children: any }) => {
  return <div class={style.label}>{props.children}</div>;
};

const Item = (props: { children: any; alert?: boolean }) => {
  return (
    <div class={style.item} data-alert={props.alert}>
      {props.children}
    </div>
  );
};

export const ContextMenu = {
  Root,
  Icon: ItemIcon,
  Item,
  Label: ItemLabel,
};
