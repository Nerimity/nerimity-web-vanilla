import { storeEmitter } from "../EventEmitter";

export const accountStore = createAccountStore();

function createAccountStore() {
  let authenticated = false;

  const setAuthenticated = (newAuthenticated: boolean) => {
    authenticated = newAuthenticated;
    storeEmitter.emit("user:authenticated");
  };

  return {
    get authenticated() {
      return authenticated;
    },
    setAuthenticated,
  };
}
