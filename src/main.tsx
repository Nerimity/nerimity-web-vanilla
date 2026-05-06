import { serverSidebar } from "./sidebar";
import "./style.css";
import { socket } from "./services/socket";

socket.connect();

const App = () => {
  return serverSidebar.render();
};

document.getElementById("app")!.appendChild(App());
