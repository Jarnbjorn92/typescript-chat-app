<script setup lang="ts">
import { computed } from "vue";
import { useChatStore } from "../stores/chat";

const chatStore = useChatStore();

const currentUsername = computed(() => chatStore.currentUser?.username);
</script>

<template>
  <div class="active-users">
    <div class="current-user">
      You are signed in as: <span class="username">{{ currentUsername }}</span>
    </div>
    <div class="users-list">
      <h3>Active Users</h3>
      <div
        v-for="user in chatStore.users"
        :key="user.id"
        :class="[
          'user-item',
          { 'current-user': user.id === chatStore.currentUser?.id },
        ]"
      >
        {{ user.username }}
        <span v-if="user.id === chatStore.currentUser?.id">(You)</span>
        <span
          class="status-indicator"
          :class="{ online: user.isOnline }"
        ></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active-users {
  padding: 1rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.current-user {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #dee2e6;
}

.username {
  font-weight: bold;
  color: #42b983;
}

.users-list {
  margin-top: 1rem;
}

.users-list h3 {
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  border-radius: 0.25rem;
  background-color: #f8f9fa;
}

.user-item.current-user {
  background-color: #e9ecef;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #dc3545;
}

.status-indicator.online {
  background-color: #42b983;
}
</style>
