import { userLogout } from "../services/userService";
import { removeLocalItem } from "./localStorage";

export const logout = (opts: { redirect?: boolean; keepCache?: boolean }) => {
  userLogout();

  setTimeout(async () => {
    if (!opts.keepCache) {
      localStorage.clear();
    }
    removeLocalItem("userToken");
    if (opts.redirect) {
      location.href = "/";
    }
  }, 500);
};
