import type { RawFriend } from "../Types";
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

  return { friends, setFriends };
}
