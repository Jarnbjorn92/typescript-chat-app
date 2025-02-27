export interface User {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen?: Date;
  role?: "admin" | "member";
  rooms?: string[];
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  roomId: string;
  type: "text" | "emoji" | "image" | "file" | "system";
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  createdAt: Date;
  pending?: boolean;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
}

export interface RoomParticipant {
  userId: string;
  role: "admin" | "moderator" | "member";
  joinedAt: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: RoomParticipant[];
  isPrivate: boolean;
  lastMessage?: Message;
  metadata?: {
    description?: string;
    customData?: Record<string, any>;
  };
}

export interface WebSocketMessage {
  eventType: string;
  message?: Message;
  messages?: Message[];
  users?: User[];
  user?: User;
  room?: ChatRoom;
  rooms?: ChatRoom[]; 
  error?: string;
}