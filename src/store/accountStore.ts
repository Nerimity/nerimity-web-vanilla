import type { RawUser } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { User } from "./userStore";

export const accountStore = createAccountStore();

function createAccountStore() {
  let authenticated = false;
  let currentUser: User | null = null;

  const setCurrentUser = (user: RawUser) => {
    currentUser = new User(user);
  };

  const setAuthenticated = (newAuthenticated: boolean) => {
    authenticated = newAuthenticated;
    storeEmitter.emit("user:authenticated");
  };

  return {
    get authenticated() {
      return authenticated;
    },
    setAuthenticated,
    get currentUser() {
      return currentUser;
    },
    setCurrentUser,
  };
}
