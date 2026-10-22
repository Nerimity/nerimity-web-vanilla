import { FriendStatus, type RawFriend } from "../Types";
import { storeEmitter } from "../utils/EventEmitter";
import { userStore } from "./userStore";

export const friendStore = createFriendStore();

export class Friend {
  id: string;
  createdAt: number;
  recipientId: string;
  status: number;
  constructor(data: RawFriend) {
    this.id = data.id;
    this.createdAt = data.createdAt;
    this.recipientId = data.recipientId;
    this.status = data.status;
  }
  get user() {
    return userStore.users.get(this.recipientId);
  }
}

function createFriendStore() {
  const friends = new Map<string, Friend>();

  const setFriends = (newfriends: RawFriend[]) => {
    friends.clear();
    for (let i = 0; i < newfriends.length; i++) {
      const friend = newfriends[i]!;
      userStore.addUser(friend.recipient);
      friends.set(friend.recipientId, new Friend(friend));
    }
  };

  const setFriend = (rawFriend: RawFriend) => {
    userStore.addUser(rawFriend.recipient);
    const friend = new Friend(rawFriend);
    friends.set(friend.recipientId, friend);
    storeEmitter.emit("friend:request", { friend });
  };

  const updateStatus = (userId: string, status: FriendStatus) => {
    const friend = friends.get(userId);
    if (!friend) return;
    friend.status = status;
    storeEmitter.emit("friend:request", { friend });
  };

  const remove = (userId: string) => {
    const friend = friends.get(userId);
    if (!friend) return;
    friends.delete(userId);
    storeEmitter.emit("friend:request", { friend });
  };

  const isFriendBlocked = (userId: string) =>
    friends.get(userId)?.status === FriendStatus.BLOCKED;

  return {
    friends,
    setFriends,
    isFriendBlocked,
    setFriend,
    updateStatus,
    remove,
  };
}
