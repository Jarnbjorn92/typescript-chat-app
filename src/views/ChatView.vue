<script setup lang="ts">
import { onMounted } from "vue";
// import { useRoute } from "vue-router";
import { useChatStore } from "@/stores/chat";
import ChatRoom from "@/components/ChatRoom.vue";
import UserList from "@/components/UserList.vue";


// const route = useRoute();
const chatStore = useChatStore();

onMounted(() => {
  // Init chat room
  // const roomId = route.params.roomId as string;
  // Add room data fetch backend here
});
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
  height: 100vh;
}

.user-list {
  border-right: 1px solid #eee;
}

.chat-room {
  height: 100%;
}
</style>
