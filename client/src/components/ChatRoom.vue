<script setup lang="ts">
import { ref, computed } from 'vue';
import type { User } from '../types';
import { useWebSocket } from '../composables/useWebSocket';

const props = defineProps<{
  roomId: string;
  currentUser: User;
}>();

const { messages, sendMessage, isConnected } = useWebSocket('ws://your-websocket-server');
const newMessage = ref('');

const sendNewMessage = () => {
  if (newMessage.value.trim()) {
    sendMessage({
      content: newMessage.value,
      senderId: props.currentUser.id,
      roomId: props.roomId,
      type: 'text'
    });
    newMessage.value = '';
  }
};

const roomMessages = computed(() => 
  messages.value.filter(msg => msg.roomId === props.roomId)
);
</script>

<template>
  <div class="chat-room">
    <div class="messages-container">
      <div
        v-for="message in roomMessages"
        :key="message.id"
        :class="['message', { 'own-message': message.senderId === currentUser.id }]"
      >
        <div class="message-content">
          {{ message.content }}
        </div>
        <div class="message-timestamp">
          {{ new Date(message.timestamp).toLocaleTimeString() }}
        </div>
      </div>
    </div>
    
    <div class="message-input">
      <input
        v-model="newMessage"
        type="text"
        placeholder="Type a message..."
        @keyup.enter="sendNewMessage"
      />
      <button 
        @click="sendNewMessage"
        :disabled="!isConnected"
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
}

.messages-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin-bottom: 1rem;
  max-width: 70%;
}

.own-message {
  margin-left: auto;
}

.message-input {
  display: flex;
  padding: 1rem;
  gap: 0.5rem;
}

.message-input input {
  flex-grow: 1;
  padding: 0.5rem;
}
</style>