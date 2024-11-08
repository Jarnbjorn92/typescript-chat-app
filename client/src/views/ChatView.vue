// src/views/ChatView.vue
<script setup lang="ts">
import { useChatStore } from "../stores/chat";
import ChatRoom from "../components/ChatRoom.vue";
import UserList from "../components/UserList.vue";

const chatStore = useChatStore();
</script>

<template>
  <div class="chat-container">
    <UserList class="user-list" />
    <ChatRoom
      v-if="chatStore.currentUser"
      :roomId="$route.params.roomId as string"
      :currentUser="chatStore.currentUser"
      class="chat-room"
    />
  </div>
</template>

<style scoped>
.chat-container {
  display: grid;
  grid-template-columns: 250px 1fr;
  height: 90vh;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.error-message {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
