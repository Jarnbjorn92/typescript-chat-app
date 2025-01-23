<script setup lang="ts">
import { computed, watch } from "vue";
import { useChatStore } from "../stores/chat";
import type { User } from "../../../shared/types";

const chatStore = useChatStore();

// Use computed properties directly from the store's users array
const onlineUsers = computed(() =>
  chatStore.users.filter((user) => user.isOnline)
);

const offlineUsers = computed(() =>
  chatStore.users.filter((user) => !user.isOnline)
);

const formatUsername = (user: User) => {
  if (user.id === chatStore.currentUser?.id) {
    return `${user.username} (You)`;
  }
  return user.username;
};

const getInitials = (username: string) => {
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

// Debug computed to help track state
const debug = computed(() => ({
  totalUsers: chatStore.users.length,
  onlineCount: onlineUsers.value.length,
  offlineCount: offlineUsers.value.length,
  currentUser: chatStore.currentUser?.username,
  allUsers: chatStore.users.map((u) => ({
    id: u.id,
    username: u.username,
    isOnline: u.isOnline,
  })),
}));

// Watch for changes in the users list
watch(
  () => chatStore.users,
  (newUsers) => {
    console.log("Users updated in store:", newUsers);
  },
  { deep: true }
);
</script>

<template>
  <div class="user-list">
    <div class="user-list-header">
      <h2>Online Users</h2>
      <div class="online-count">{{ onlineUsers.length }} online</div>
    </div>

    <!-- Debug info (remove in production) -->
    <div class="debug-info">
      <p>Total Users: {{ debug.totalUsers }}</p>
      <p>Current User: {{ debug.currentUser }}</p>
      <details>
        <summary>All Users</summary>
        <pre>{{ JSON.stringify(debug.allUsers, null, 2) }}</pre>
      </details>
    </div>

    <!-- Online Users -->
    <div class="user-section">
      <div v-if="onlineUsers.length === 0" class="empty-state">
        No users online
      </div>
      <div v-for="user in onlineUsers" :key="user.id" class="user-item">
        <div class="user-avatar" :data-initials="getInitials(user.username)">
          <div class="status-indicator online"></div>
        </div>
        <div class="user-info">
          <div
            class="username"
            :class="{ 'current-user': user.id === chatStore.currentUser?.id }"
          >
            {{ formatUsername(user) }}
          </div>
          <div class="status">Online</div>
        </div>
      </div>
    </div>

    <!-- Offline Users -->
    <div v-if="offlineUsers.length > 0" class="user-section">
      <h3>Offline</h3>
      <div v-for="user in offlineUsers" :key="user.id" class="user-item">
        <div class="user-avatar" :data-initials="getInitials(user.username)">
          <div class="status-indicator offline"></div>
        </div>
        <div class="user-info">
          <div
            class="username"
            :class="{ 'current-user': user.id === chatStore.currentUser?.id }"
          >
            {{ formatUsername(user) }}
          </div>
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
  color: #2c3e50;
}

.online-count {
  font-size: 0.875rem;
  color: #6c757d;
  background-color: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.empty-state {
  text-align: center;
  padding: 1rem;
  color: #6c757d;
  font-style: italic;
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
  margin-bottom: 0.5rem;
  background-color: white;
  transition: background-color 0.2s;
}

.user-item:hover {
  background-color: #e9ecef;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #3aa876;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  position: relative;
}

.user-avatar::before {
  content: attr(data-initials);
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

.status-indicator.online {
  background-color: #28a745;
}

.status-indicator.offline {
  background-color: #dc3545;
}

.user-info {
  margin-left: 0.75rem;
  flex-grow: 1;
}

.username {
  font-weight: 500;
  color: #2c3e50;
}

.current-user {
  color: #000;
  font-weight: 600;
}

.status {
  font-size: 0.75rem;
  color: #6c757d;
}

.debug-info {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #e9ecef;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.debug-info details {
  margin-top: 0.5rem;
}

.debug-info pre {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: white;
  border-radius: 0.25rem;
  overflow-x: auto;
}
</style>
