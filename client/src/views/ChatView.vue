<script setup lang="ts">
import { ref, watch } from "vue";
import { useChatStore } from "../stores/chat";
import { useWebSocket } from "../composables/useWebSocket";
import ChatRoom from "../components/ChatRoom.vue";
import UserList from "../components/UserList.vue";

const chatStore = useChatStore();
const { isConnected, error } = useWebSocket("ws://localhost:3000");
const showConnectionStatus = ref(true);

// Watch for connection and hide the status after connected
watch(isConnected, (connected) => {
  if (connected) {
    setTimeout(() => {
      showConnectionStatus.value = false;
    }, 1000);
  } else {
    showConnectionStatus.value = true;
  }
});
</script>

<template>
  <div class="chat-container">
    <!-- Connection Status -->
    <div v-if="showConnectionStatus && !isConnected" class="connection-status">
      Connecting to chat server...
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Chat Layout -->
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
  position: relative;
}

.user-list {
  border-right: 1px solid #eee;
  overflow-y: auto;
}

.chat-room {
  height: 100%;
}

.connection-status {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: opacity 0.3s ease-in-out;
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
  z-index: 1000;
}
</style>
