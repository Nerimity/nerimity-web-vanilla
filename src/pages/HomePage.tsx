import { h } from "../h";
import { Link } from "../components/link";

const createHomePage = () => {
  const app = document.getElementById("app")!;
  const content = (
    <div>
      <Link decoration href="/app">
        App
      </Link>
      <br />
      <Link decoration href="/login">
        Login
      </Link>
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
