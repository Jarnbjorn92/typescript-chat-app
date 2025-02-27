import { defineStore } from "pinia";
import type { User, Message, ChatRoom } from "../../../shared/types";

interface MessageCache {
  id: string;
  timestamp: number;
}

interface ChatState {
  currentUser: User | null;
  users: User[];
  messages: Message[];
  rooms: ChatRoom[];
  messageCache: MessageCache[];
}

export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    currentUser: null,
    users: [],
    messages: [],
    rooms: [
      {
        id: "general",
        name: "General Chat",
        participants: [],
        isPrivate: false,
      },
    ],
    messageCache: [],
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

    getRoomById:
      (state) =>
      (roomId: string): ChatRoom | undefined =>
        state.rooms.find((room) => room.id === roomId),
  },

  actions: {
    setCurrentUser(user: User) {
      this.currentUser = {
        id: user.id,
        username: user.username,
        isOnline: true,
        lastSeen: new Date(),
      };

      // Add user to general room if not already present
      const generalRoom = this.getRoomById("general");
      if (generalRoom) {
        const isParticipant = generalRoom.participants.some(
          (p) => p.userId === user.id
        );
        if (!isParticipant) {
          generalRoom.participants.push({
            userId: user.id,
            role: "member",
            joinedAt: new Date(),
          });
        }
      }

      this.addUser(this.currentUser);
    },

    setUsers(users: User[]) {
      const currentUserId = this.currentUser?.id;

      // Preserve current user's online status
      const updatedUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        isOnline: user.id === currentUserId ? true : user.isOnline,
        lastSeen: user.lastSeen ?? new Date(),
        role: user.role,
      }));

      // Make sure current user is included
      if (
        currentUserId &&
        !updatedUsers.some((u) => u.id === currentUserId) &&
        this.currentUser
      ) {
        updatedUsers.push({
          ...this.currentUser,
          isOnline: true,
          lastSeen: new Date(),
          role: this.currentUser.role, // Ensure role is included
        });
      }

      // Sort by username
      this.users = updatedUsers.sort((a, b) =>
        a.username.localeCompare(b.username)
      );
    },

    addUser(user: User) {
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

      // If it's the current user, make sure it stays online
      if (this.currentUser?.id === user.id) {
        normalizedUser.isOnline = true;
      }

      if (existingUserIndex !== -1) {
        this.users[existingUserIndex] = normalizedUser;
      } else {
        this.users.push(normalizedUser);
      }

      this.users = this.users.sort((a, b) =>
        a.username.localeCompare(b.username)
      );
    },

    updateUserStatus(userId: string, isOnline: boolean) {
      const user = this.users.find((u) => u.id === userId);
      if (user && !(this.currentUser?.id === userId && !isOnline)) {
        user.isOnline = isOnline;
        if (!isOnline) {
          user.lastSeen = new Date();
        }
      }
    },

    addMessage(message: Message) {
      // Don't add empty messages
      if (!message.content?.trim()) {
        console.warn("Attempted to add empty message");
        return;
      }

      // Check for duplicates using a more robust approach
      const isDuplicate = this.messages.some(
        (m) =>
          m.id === message.id ||
          (m.senderId === message.senderId &&
            m.content === message.content &&
            Math.abs(
              new Date(m.timestamp).getTime() -
                new Date(message.timestamp).getTime()
            ) < 1000)
      );

      if (isDuplicate) {
        console.log("Duplicate message detected, skipping:", message);
        return;
      }

      // Add to message cache to prevent duplicates
      this.messageCache.push({
        id: `${message.senderId}-${new Date(message.timestamp).getTime()}`,
        timestamp: Date.now(),
      });

      // Clean up old cache entries
      this.messageCache = this.messageCache.filter(
        (entry) => Date.now() - entry.timestamp < 5000
      );

      // Replace pending version if exists
      this.messages = this.messages.filter(
        (m) =>
          !(
            m.pending &&
            m.senderId === message.senderId &&
            Math.abs(
              new Date(m.timestamp).getTime() -
                new Date(message.timestamp).getTime()
            ) < 2000
          )
      );

      this.messages.push(message);
      this.messages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },

    updateOrAddMessage(message: Message) {
      // Find any existing message with this ID or a pending message with similar content
      const existingIndex = this.messages.findIndex(
        (m) =>
          m.id === message.id ||
          (m.pending &&
            m.senderId === message.senderId &&
            m.content === message.content &&
            Math.abs(
              new Date(m.timestamp).getTime() -
                new Date(message.timestamp).getTime()
            ) < 2000)
      );

      if (existingIndex !== -1) {
        // Update existing message
        this.messages[existingIndex] = {
          ...message,
          pending: false,
        };
      } else {
        // Add as new message
        this.addMessage(message);
      }
    },

    setMessages(messages: Message[]) {
      // Filter out empty messages
      const validMessages = messages.filter((msg) => msg.content?.trim());

      // Sort by timestamp
      this.messages = validMessages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },

    removeMessage(messageId: string) {
      this.messages = this.messages.filter((m) => m.id !== messageId);
    },

    handleDisconnect() {
      if (this.currentUser) {
        this.updateUserStatus(this.currentUser.id, false);
      }

      this.users.forEach((user) => {
        if (user.id !== this.currentUser?.id) {
          this.updateUserStatus(user.id, false);
        }
      });
    },

    addRoom(room: ChatRoom) {
      const existingIndex = this.rooms.findIndex((r) => r.id === room.id);
      if (existingIndex !== -1) {
        this.rooms[existingIndex] = {
          ...room,
          participants: [...room.participants],
        };
      } else {
        this.rooms.push({ ...room, participants: [...room.participants] });
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
      this.messages = this.messages.filter((m) => m.roomId !== roomId);
    },

    addParticipantToRoom(roomId: string, user: User) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (room && !room.participants.some((p) => p.userId === user.id)) {
        room.participants.push({
          userId: user.id,
          role: user.role ?? "member",
          joinedAt: new Date(),
        });
      }
    },

    removeParticipantFromRoom(roomId: string, userId: string) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (room) {
        room.participants = room.participants.filter(
          (p) => p.userId !== userId
        );
      }
    },

    clearMessages() {
      this.messages = [];
      this.messageCache = [];
    },

    reset() {
      this.$reset();
    },
  },
});
