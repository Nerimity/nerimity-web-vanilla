import { css } from "@linaria/core";
import { h } from "../h";

const header = css`
  height: 60px;
`;
export const createAppHeader = () => {
  const container = (
    <header class={header}>
      <h1>header</h1>
    </header>
  ) as unknown as HTMLDivElement;

  const render = () => {
    return container;
  };
  const destroy = () => {
    container.remove();
  };
  return { render, destroy };
};
