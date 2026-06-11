import type { ServerClan, Profile, RawUser } from "../Types";

export const userStore = createUserStore();

export class User {
  id: string;
  username: string;
  avatar?: string;
  hexColor: string;
  tag: string;
  profile?: Profile;
  banner?: string;
  bot?: boolean;
  constructor(data: RawUser) {
    this.id = data.id;
    this.username = data.username;
    this.avatar = data.avatar;
    this.hexColor = data.hexColor;
    this.tag = data.tag;
    this.profile = data.profile;
    this.banner = data.banner;
    this.bot = data.bot;
  }
}

function createUserStore() {
  const users = new Map<string, User>();
  const clanCache = new Map<string, ServerClan>();

  const addUser = (user: RawUser) => {
    if (user.profile?.clan) {
      const serverId = user.profile.clan.serverId;
      if (!clanCache.has(serverId)) {
        clanCache.set(serverId, user.profile.clan);
      } else {
        user.profile.clan = clanCache.get(serverId)!;
      }
    }
    users.set(user.id, new User(user));
  };

  return { users, addUser };
}
