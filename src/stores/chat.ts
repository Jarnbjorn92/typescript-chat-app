import { defineStore } from 'pinia'
import type { User, Message, ChatRoom } from '../types'

export const useChatStore = defineStore('chat', {
  state: () => ({
    currentUser: null as User | null,
    rooms: [] as ChatRoom[],
    activeRoom: null as ChatRoom | null,
    messages: [] as Message[]
  }),
  
  actions: {
    setCurrentUser(user: User) {
      this.currentUser = user
    },
    addMessage(message: Message) {
      this.messages.push(message)
    },
    setActiveRoom(room: ChatRoom) {
      this.activeRoom = room
    }
  }
})