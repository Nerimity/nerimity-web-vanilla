import { css } from "@linaria/core";

import { h } from "../h";
import { portalElement } from "../utils/portal";
import { Button } from "./button";
import { Icon } from "./icon";

const modalBackdrop = css`
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1111111111111111;
`;
const modalRoot = css`
  background: var(--gray-900);
  border-radius: var(--radius-8);
  border: solid 1px var(--gray-700);
`;
const header = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 8px;
  color: var(--primary-color);
  .closeButton {
    padding: 0px;
  }
  &[data-alert="true"] {
    color: var(--alert-color);
  }
`;

const Root = (props: { children: any }) => {
  return <div class={modalRoot}>{props.children}</div>;
};
const Header = (props: { label: string; icon?: string; alert?: boolean }) => {
  return (
    <div class={header} data-alert={props.alert}>
      {props.icon && <Icon class="icon" name={props.icon} />}
      <span>{props.label}</span>
      <Button class="closeButton" icon="close" hoverBorder alert />
    </div>
  );
};
const Body = (props: { children: any }) => {
  return <div>{props.children}</div>;
};

export const Modal = {
  Root,
  Header,
  Body,
};

export const createModal = (children: Node) => {
  const abortController = new AbortController();
  // const { signal } = abortController;
  const modal = children as HTMLElement;
  const portal = portalElement();
  portal.appendChild(<div class={modalBackdrop}>{modal}</div>);

  const destroy = () => {
    abortController.abort();
    modal.remove();
  };

  return { destroy };
};
