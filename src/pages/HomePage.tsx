import { Button } from "../components/button";
import { h } from "../h";

import style from "./HomePage.module.css";
const createHomePage = () => {
  const app = document.getElementById("app")!;
  const content = (
    <div class={style.homeContainer}>
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
