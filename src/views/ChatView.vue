// src/views/ChatView.vue
<script setup lang="ts">
import { ref } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useChatStore } from "../stores/chat";
import ChatRoom from "../components/ChatRoom.vue";
import UserList from "../components/UserList.vue";

const chatStore = useChatStore();
const { isConnected, messages, error, sendMessage } = useWebSocket('ws://localhost:3000');

const newMessage = ref("");

const handleSendMessage = () => {
  if (newMessage.value.trim() && chatStore.currentUser) {
    sendMessage({
      content: newMessage.value,
      senderId: chatStore.currentUser.id,
      roomId: 'general',
      type: 'text'
    });
    newMessage.value = "";
  }
};
</script>

<template>
  <div class="chat-container">
    <!-- Connection Status -->
    <div v-if="!isConnected" class="connection-status">
      Connecting to chat...
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Chat Interface -->
    <UserList class="user-list" />
    <ChatRoom
      v-if="chatStore.currentUser"
      :roomId="$route.params.roomId as string"
      :currentUser="chatStore.currentUser"
      :messages="messages"
      @send-message="handleSendMessage"
      class="chat-room"
    />
  </div>
</template>

<style scoped>
.chat-container {
  display: grid;
  grid-template-columns: 250px 1fr;
  height: 100vh;
}

.user-list {
  border-right: 1px solid #eee;
}

.chat-room {
  height: 100%;
}

.connection-status {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.error-message {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>