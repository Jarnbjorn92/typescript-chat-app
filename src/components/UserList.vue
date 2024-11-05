// components/UserList.vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { useChatStore } from "../stores/chat";
import type { User } from "../types";

const chatStore = useChatStore();

// Normally you'd fetch this from your backend
const users = ref<User[]>([
  {
    id: "1",
    username: "Alice Smith",
    avatar: "A",
    isOnline: true,
  },
  {
    id: "2",
    username: "Bob Johnson",
    avatar: "B",
    isOnline: true,
  },
  {
    id: "3",
    username: "Carol Wilson",
    avatar: "C",
    isOnline: false,
  },
]);

const onlineUsers = computed(() => users.value.filter((user) => user.isOnline));

const offlineUsers = computed(() =>
  users.value.filter((user) => !user.isOnline)
);

const getInitials = (username: string) => {
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const startChat = (user: User) => {
  // In a real app, this would create or open a private chat
  console.log("Starting chat with:", user.username);
};
</script>

<template>
  <div class="user-list">
    <div class="user-list-header">
      <h2>Users</h2>
      <div class="online-count">{{ onlineUsers.length }} online</div>
    </div>

    <div class="user-section">
      <h3>Online</h3>
      <div
        v-for="user in onlineUsers"
        :key="user.id"
        class="user-item"
        @click="startChat(user)"
      >
        <div
          class="user-avatar"
          :data-initials="user.avatar || getInitials(user.username)"
        >
          <div class="status-indicator online"></div>
        </div>
        <div class="user-info">
          <div class="username">{{ user.username }}</div>
          <div class="status">Online</div>
        </div>
      </div>
    </div>

    <div class="user-section">
      <h3>Offline</h3>
      <div
        v-for="user in offlineUsers"
        :key="user.id"
        class="user-item"
        @click="startChat(user)"
      >
        <div
          class="user-avatar"
          :data-initials="user.avatar || getInitials(user.username)"
        >
          <div class="status-indicator offline"></div>
        </div>
        <div class="user-info">
          <div class="username">{{ user.username }}</div>
          <div class="status">Offline</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-list {
  background-color: #f8f9fa;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}

.user-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #dee2e6;
}

.user-list-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.online-count {
  font-size: 0.875rem;
  color: #6c757d;
}

.user-section {
  margin-bottom: 1.5rem;
}

.user-section h3 {
  font-size: 0.875rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
}

.user-item:hover {
  background-color: #e9ecef;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #495057;
  position: relative;
}

.user-avatar::before {
  content: attr(data-initials);
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
}

.status-indicator.online {
  background-color: #28a745;
}

.status-indicator.offline {
  background-color: #dc3545;
}

.user-info {
  margin-left: 0.75rem;
}

.username {
  font-weight: 500;
  color: #212529;
}

.status {
  font-size: 0.75rem;
  color: #6c757d;
}
</style>
