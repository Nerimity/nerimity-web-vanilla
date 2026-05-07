import type { RawUser } from "../Types";

export const userStore = createUserStore();

class User {
  id: string;
  username: string;
  avatar?: string;
  hexColor: string;
  tag: string;
  constructor(data: RawUser) {
    this.id = data.id;
    this.username = data.username;
    this.avatar = data.avatar;
    this.hexColor = data.hexColor;
    this.tag = data.tag;
  }
}

function createUserStore() {
  const users = new Map<string, User>();

  const addUser = (user: RawUser) => users.set(user.id, new User(user));

  return { users, addUser };
}
