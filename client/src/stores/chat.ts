import { defineStore } from "pinia";
import type { User, Message } from "../types";

interface ChatState {
  currentUser: User | null;
  users: User[];
  messages: Message[];
}

export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    currentUser: null,
    users: [],
    messages: [],
  }),

  actions: {
    setCurrentUser(user: User) {
      this.currentUser = user;
      if (!this.users.find((u) => u.id === user.id)) {
        this.users.push(user);
      }
    },

    addUser(user: User) {
      if (!this.users.find((u) => u.id === user.id)) {
        this.users.push(user);
      }
    },

    removeUser(userId: string) {
      this.users = this.users.filter((user) => user.id !== userId);
    },

    updateUserStatus(userId: string, isOnline: boolean) {
      const user = this.users.find((u) => u.id === userId);
      if (user) {
        user.isOnline = isOnline;
      }
    },

    addMessage(message: Message) {
      this.messages.push(message);
    },
  },

  getters: {
    onlineUsers: (state) => state.users.filter((user) => user.isOnline),
    offlineUsers: (state) => state.users.filter((user) => !user.isOnline),
  },
});
