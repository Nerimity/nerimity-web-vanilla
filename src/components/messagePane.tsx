import { h } from "../h";

const createMessagePane = () => {
  const el = (<div></div>) as unknown as HTMLDivElement;

  const render = () => el;

  const destroy = () => {
    el.remove();
  };

  return { render, destroy };
};
