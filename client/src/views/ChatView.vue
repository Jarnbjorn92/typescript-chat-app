<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useChatStore } from "../stores/chat";
import { useWebSocket } from "../composables/useWebSocket";
import ChatRoom from "../components/ChatRoom.vue";
import ActiveUsers from "../components/ActiveUsers.vue";

const route = useRoute();
const chatStore = useChatStore();
const { isConnected, error } = useWebSocket("ws://localhost:3000");
const showConnectionStatus = computed(() => !isConnected);

const currentRoom = computed(() =>
  chatStore.getRoomById(route.params.roomId as string)
);

onMounted(() => {
  if (currentRoom.value) {
    document.title = `${currentRoom.value.name} - Chat`;
  }
});
</script>

<template>
  <div class="chat-view">
    <ActiveUsers :roomId="route.params.roomId as string" class="sidebar" />

    <div class="main-content">
      <div
        v-if="showConnectionStatus && !isConnected"
        class="connection-status"
      >
        Connecting to server...
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <ChatRoom
        v-if="currentRoom"
        :roomId="route.params.roomId as string"
        class="chat-container"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-view {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100vh;
  background: #f8f9fa;
}

.sidebar {
  border-right: 1px solid #dee2e6;
  background: white;
}

.main-content {
  display: flex;
  flex-direction: column;
  position: relative;
}

.chat-container {
  flex: 1;
  overflow: hidden;
}
</style>
