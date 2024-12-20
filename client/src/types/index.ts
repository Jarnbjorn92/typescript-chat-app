export interface User {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Message {
  createdAt: Date;
  id: string;
  content: string;
  senderId: string;
  roomId: string;
  timestamp: Date;
  type: "text" | "emoji" | "image";
  pending?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: User[];
  isPrivate: boolean;
}

export interface WebSocketMessage {
  eventType: string;
  message?: Message;
  messages?: Message[];
  users?: User[];
  user?: User;
  error?: string;
}