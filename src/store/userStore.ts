import {
  type ServerClan,
  type Profile,
  type RawUser,
  LastOnlineStatus,
  FriendStatus,
} from "../Types";
import { accountStore } from "./accountStore";
import { friendStore } from "./friendStore";

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
  joinedAt: number;
  badges: number;
  inboxChannelId?: string;
  lastOnlineAt?: number;
  lastOnlineStatus?: LastOnlineStatus;
  constructor(data: RawUser) {
    this.id = data.id;
    this.username = data.username;
    this.avatar = data.avatar;
    this.hexColor = data.hexColor;
    this.tag = data.tag;
    this.profile = data.profile;
    this.banner = data.banner;
    this.bot = data.bot;
    this.joinedAt = data.joinedAt;
    this.badges = data.badges;

    this.lastOnlineAt = data.lastOnlineAt;
    this.lastOnlineStatus = data.lastOnlineStatus;
  }

  update(updated: Partial<RawUser>) {
    this.username = updated.username ?? this.username;
    this.tag = updated.tag ?? this.tag;
    this.avatar = updated.avatar ?? this.avatar;
    this.banner = updated.banner ?? this.banner;
    this.lastOnlineAt = updated.lastOnlineAt ?? this.lastOnlineAt;
    this.lastOnlineStatus = updated.lastOnlineStatus ?? this.lastOnlineStatus;
  }

  updateLastOnlineAt() {
    if (
      accountStore.currentUser?.id === this.id &&
      this.lastOnlineStatus !== LastOnlineStatus.HIDDEN
    ) {
      this.lastOnlineAt = Date.now();
      return;
    }
    if (this.lastOnlineStatus === LastOnlineStatus.FRIENDS_AND_SERVERS) {
      this.lastOnlineAt = Date.now();

      return;
    }
    if (this.lastOnlineStatus === LastOnlineStatus.FRIENDS) {
      const isFriends =
        friendStore.friends.get(this.id)?.status === FriendStatus.FRIENDS;
      if (isFriends) {
        this.lastOnlineAt = Date.now();
        return;
      }
    }
    this.lastOnlineAt = undefined;
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
    const newUser = new User(user);

    users.set(user.id, newUser);
    return newUser;
  };

  return { users, addUser };
}
