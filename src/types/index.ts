export interface User {
    id: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
  }
  
  export interface Message {
    id: string;
    content: string;
    senderId: string;
    roomId: string;
    timestamp: Date;
    type: 'text' | 'emoji' | 'image';
  }
  
  export interface ChatRoom {
    id: string;
    name: string;
    participants: User[];
    isPrivate: boolean;
  }