// src/types/index.ts
export interface User {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderUsername?: string;
  roomId: string;
  timestamp: Date;
  type: "text" | "emoji" | "image";
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: User[];
  isPrivate: boolean;
}
