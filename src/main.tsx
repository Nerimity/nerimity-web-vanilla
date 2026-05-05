import { h, Fragment } from "./h";
import { serverSidebar } from "./sidebar";
import "./style.css";
import { socket } from "./services/socket";

socket.connect();

const App = () => {
  return (
    <Fragment>
      <div>{serverSidebar.render()}</div>
    </Fragment>
  );
};

document.getElementById("app")!.appendChild(App());
