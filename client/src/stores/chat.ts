import { defineStore } from "pinia";
import type { User, Message, ChatRoom } from "../types";

interface ChatState {
  currentUser: User | null;
  users: User[];
  messages: Message[];
  rooms: ChatRoom[];
}

export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    currentUser: null,
    users: [],
    messages: [],
    rooms: [],
  }),

  getters: {
    onlineUsers: (state): User[] =>
      state.users
        .filter((user) => user.isOnline)
        .sort((a, b) => a.username.localeCompare(b.username)),

    offlineUsers: (state): User[] =>
      state.users
        .filter((user) => !user.isOnline)
        .sort((a, b) => a.username.localeCompare(b.username)),

    messagesByRoom:
      (state) =>
      (roomId: string): Message[] =>
        state.messages.filter((message) => message.roomId === roomId),

    userCount: (state): number => state.users.length,

    onlineCount: (state): number =>
      state.users.filter((user) => user.isOnline).length,

    getUserById:
      (state) =>
      (userId: string): User | undefined =>
        state.users.find((user) => user.id === userId),
  },

  actions: {
    setCurrentUser(user: User) {
      this.currentUser = {
        id: user.id,
        username: user.username,
        isOnline: true,
        lastSeen: new Date(),
      };

      this.addUser(this.currentUser);
    },

    addUser(user: User) {
      console.log("Adding/updating user:", user);
      const existingUserIndex = this.users.findIndex(
        (u) =>
          u.id === user.id ||
          u.username.toLowerCase() === user.username.toLowerCase()
      );

      const normalizedUser: User = {
        id: user.id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen ?? new Date(),
      };

      if (existingUserIndex !== -1) {
        // Update existing user while preserving online status for current user
        if (this.users[existingUserIndex].id === this.currentUser?.id) {
          normalizedUser.isOnline = true;
        }
        this.users[existingUserIndex] = normalizedUser;
      } else {
        this.users.push(normalizedUser);
      }

      // Sort users by username
      this.users = this.users.sort((a, b) =>
        a.username.localeCompare(b.username)
      );

      console.log("Updated users list:", this.users);
    },

    setUsers(users: User[]) {
      console.log("Setting users list:", users);
      const currentUserId = this.currentUser?.id;

      // Create a new normalized users array
      const normalizedUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        isOnline: user.id === currentUserId ? true : user.isOnline,
        lastSeen: user.lastSeen ?? new Date(),
      }));

      // Ensure current user is included and marked as online
      if (
        currentUserId &&
        !normalizedUsers.some((u) => u.id === currentUserId)
      ) {
        normalizedUsers.push({
          ...this.currentUser!,
          isOnline: true,
          lastSeen: this.currentUser!.lastSeen ?? new Date(),
        });
      }

      // Sort users by username
      this.users = normalizedUsers.sort((a, b) =>
        a.username.localeCompare(b.username)
      );

      console.log("Updated users list:", this.users);
    },

    updateUserStatus(userId: string, isOnline: boolean) {
      const user = this.users.find((u) => u.id === userId);

      // Don't update status if it's the current user going offline
      if (user && !(this.currentUser?.id === userId && !isOnline)) {
        user.isOnline = isOnline;
        if (!isOnline) {
          user.lastSeen = new Date();
        }
      }
    },

    addMessage(message: Message) {
      // Remove any pending version of this message
      this.messages = this.messages.filter(
        (m) =>
          !(
            m.pending &&
            m.senderId === message.senderId &&
            Math.abs(m.timestamp.getTime() - message.timestamp.getTime()) < 1000
          )
      );

      // Add the new message
      this.messages.push(message);

      // Sort messages by timestamp
      this.messages.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    },

    setMessages(messages: Message[]) {
      this.messages = messages.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    },

    removeMessage(messageId: string) {
      this.messages = this.messages.filter((m) => m.id !== messageId);
    },

    addRoom(room: ChatRoom) {
      const existingIndex = this.rooms.findIndex((r) => r.id === room.id);
      if (existingIndex !== -1) {
        this.rooms[existingIndex] = room;
      } else {
        this.rooms.push(room);
      }
    },

    updateRoom(roomId: string, updates: Partial<Omit<ChatRoom, "id">>) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (room) {
        Object.assign(room, updates);
      }
    },

    removeRoom(roomId: string) {
      this.rooms = this.rooms.filter((r) => r.id !== roomId);
    },

    addParticipantToRoom(roomId: string, user: User) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (room && !room.participants.some((p) => p.id === user.id)) {
        room.participants.push(user);
      }
    },

    removeParticipantFromRoom(roomId: string, userId: string) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (room) {
        room.participants = room.participants.filter((p) => p.id !== userId);
      }
    },

    clearMessages() {
      this.messages = [];
    },

    reset() {
      this.$reset();
    },
  },
});
