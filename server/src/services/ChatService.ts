import { User, Message, ChatRoom } from "../types";

class ChatService {
  private users: Map<string, User>;
  private rooms: Map<string, ChatRoom>;
  private messages: Message[];

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.messages = [];

    // Create default general room
    this.rooms.set("general", {
      id: "general",
      name: "General Chat",
      participants: [],
      isPrivate: false,
    });
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
    const generalRoom = this.rooms.get("general");
    if (generalRoom) {
      generalRoom.participants.push(user);
    }
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
    this.rooms.forEach((room) => {
      room.participants = room.participants.filter((p) => p.id !== userId);
    });
  }

  addMessage(message: Message): Message {
    this.messages.push(message);
    return message;
  }

  getRoomMessages(roomId: string): Message[] {
    return this.messages.filter((m) => m.roomId === roomId);
  }

  getRoomUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    return room ? room.participants : [];
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getRooms(): ChatRoom[] {
    return Array.from(this.rooms.values());
  }
}

export const chatService = new ChatService();
