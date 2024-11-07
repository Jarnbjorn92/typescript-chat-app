import { defineStore } from 'pinia'
import type { User, Message, ChatRoom } from '../types'

interface ChatState {
  currentUser: User | null;
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  messages: Message[];
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    currentUser: null,
    rooms: [],
    activeRoom: null,
    messages: []
  }),
  
  actions: {
    setCurrentUser(user: User) {
      this.currentUser = user;
    },
    addMessage(message: Message) {
      this.messages.push(message);
    },
    setActiveRoom(room: ChatRoom) {
      this.activeRoom = room;
    },
    updateUserStatus(userId: string, isOnline: boolean) {
      this.rooms.forEach(room => {
        room.participants = room.participants.map(participant => {
          if (participant.id === userId) {
            return { ...participant, isOnline };
          }
          return participant;
        });
      });
    }
  }
})