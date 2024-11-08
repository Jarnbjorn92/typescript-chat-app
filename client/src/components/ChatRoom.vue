// src/components/ChatRoom.vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { User } from '../types';
import { useWebSocket } from '../composables/useWebSocket';

const props = defineProps<{
  roomId: string;
  currentUser: User;
}>();

const { messages, sendMessage, isConnected } = useWebSocket('ws://localhost:3000');
const newMessage = ref('');

const sendNewMessage = () => {
  if (newMessage.value.trim() && isConnected.value) {
    try {
      sendMessage({
        content: newMessage.value,
        senderId: props.currentUser.id,
        roomId: props.roomId,
        type: 'text'
      });
      newMessage.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
};

const roomMessages = computed(() => 
  messages.value.filter(msg => msg.roomId === props.roomId)
);

const formatTime = (timestamp: Date) => {
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toLocaleTimeString();
  }
  return timestamp.toLocaleTimeString();
};

const getUserDisplayName = (senderId: string) => {
  return senderId === props.currentUser.id ? 'You' : `User ${senderId.slice(0, 4)}`;
};
</script>

<template>
  <div class="chat-room">
    <!-- Connection Status -->
    <div 
      v-if="!isConnected" 
      class="connection-status"
    >
      Connecting to chat...
    </div>

    <!-- Messages Container -->
    <div class="messages-container">
      <div
        v-for="message in roomMessages"
        :key="message.id"
        :class="[
          'message',
          { 'own-message': message.senderId === currentUser.id }
        ]"
      >
        <div class="message-header">
          {{ getUserDisplayName(message.senderId) }}
        </div>
        <div class="message-bubble">
          <div class="message-content">
            {{ message.content }}
          </div>
          <div class="message-timestamp">
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Message Input -->
    <div class="message-input">
      <input
        v-model="newMessage"
        type="text"
        placeholder="Type a message..."
        @keyup.enter="sendNewMessage"
        :disabled="!isConnected"
      />
      <button 
        @click="sendNewMessage"
        :disabled="!isConnected"
        class="send-button"
      >
        Send
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f8f9fa;
}

.connection-status {
  position: sticky;
  top: 0;
  padding: 0.5rem;
  background-color: #fff3cd;
  color: #856404;
  text-align: center;
  z-index: 100;
}

.messages-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  max-width: 70%;
  animation: fadeIn 0.3s ease-in-out;
}

.message-header {
  font-size: 0.875rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
  padding-left: 0.5rem;
}

.message-bubble {
  background-color: #fff;
  padding: 0.75rem;
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.own-message {
  margin-left: auto;
}

.own-message .message-bubble {
  background-color: #007bff;
  color: white;
}

.own-message .message-header {
  text-align: right;
  padding-right: 0.5rem;
}

.message-content {
  margin-bottom: 0.25rem;
  word-break: break-word;
}

.message-timestamp {
  font-size: 0.75rem;
  color: inherit;
  opacity: 0.7;
}

.message-input {
  display: flex;
  padding: 1rem;
  gap: 0.5rem;
  background-color: white;
  border-top: 1px solid #dee2e6;
}

.message-input input {
  flex-grow: 1;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  outline: none;
  transition: border-color 0.2s;
}

.message-input input:focus {
  border-color: #007bff;
}

.message-input input:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.send-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>