import { css } from "@linaria/core";

import { mobileWidth } from "../config";
import { h } from "../h";
import { scoped } from "../utils/css";
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

  @media (max-width: ${`${mobileWidth}px`}) {
    align-items: flex-end;
  }
`;
const modalRoot = css`
  display: flex;
  flex-direction: column;
  background: var(--background);
  border-radius: var(--radius-8);
  border: solid 1px var(--gray-700);
  max-height: 80vh;
  overflow: hidden;
  @media (max-width: ${`${mobileWidth}px`}) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    flex: 1;
  }
`;
const header = css`
  display: flex;
  align-items: center;
  padding: 8px 10px;
  gap: 8px;
  color: var(--primary-color);
  .label {
    flex: 1;
  }
  .${scoped`closeButton`} {
    padding: 0px;
  }
  &[data-alert="true"] {
    color: var(--alert-color);
  }
`;

const body = css`
  display: flex;
  flex-direction: column;
  overflow: auto;
  margin-left: 12px;
  margin-right: 8px;
  @media (min-width: ${`${mobileWidth}px`}) {
    width: var(--width);
  }
  @media (max-width: ${`${mobileWidth}px`}) {
    flex: 1;
    width: initial;
  }
`;

const footer = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
  gap: 8px;
  @media (max-width: ${`${mobileWidth}px`}) {
    .button {
      flex: 1;
    }
  }
  .button {
    .icon {
      font-size: 18px;
    }
  }
`;

const Root = (props: { children: any }) => {
  return <div class={modalRoot}>{props.children}</div>;
};
const Header = (props: { label: string; icon?: string; alert?: boolean }) => {
  return (
    <div class={header} data-alert={props.alert}>
      {props.icon && <Icon class="icon" name={props.icon} />}
      <span class="label">{props.label}</span>
      <Button class={scoped`closeButton`} icon="close" hoverBorder alert />
    </div>
  );
};
const Body = (props: { children?: any; width?: string }) => {
  return (
    <div class={[body, "scrollbarHover"]} style={{ "--width": props.width }}>
      {props.children}
    </div>
  );
};

const Footer = (props: { children: any }) => {
  return <div class={footer}>{props.children}</div>;
};

export const Modal = {
  Root,
  Header,
  Body,
  Footer,
};

export const createModal = (
  children: any,
  abortController: AbortController,
) => {
  const modal = children() as HTMLElement;
  const backdrop = (<div class={modalBackdrop}>{modal}</div>) as HTMLDivElement;
  const { signal } = abortController;

  modal.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const isCloseButton = target.closest(`.${scoped`closeButton`}`);
      if (isCloseButton) {
        destroy();
        return;
      }
    },
    { signal },
  );

  portalElement().appendChild(backdrop);
  const destroy = () => {
    abortController.abort();
    backdrop.remove();
  };
  abortController.signal.addEventListener("abort", destroy, { once: true });

  return { destroy };
};
