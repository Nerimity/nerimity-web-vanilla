import { h } from "../h";
import { css } from "@linaria/core";
import { Button } from "../components/button";

const homeContainer = css`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 8px;
`;

const createHomePage = () => {
  const app = document.getElementById("app")!;
  const content = (
    <div class={homeContainer}>
      <Button label="App" primary href="/app" />
      <Button href="/login" label="Login" />
    </div>
  ) as HTMLFormElement;

  const destroy = () => {
    content.remove();
  };

  const render = () => {
    app.replaceChildren(content);
  };

  return { render, destroy };
};

export default createHomePage;
