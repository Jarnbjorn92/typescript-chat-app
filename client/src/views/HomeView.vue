`<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useChatStore } from "../stores/chat";
import { useWebSocket } from "../composables/useWebSocket";

const router = useRouter();
const chatStore = useChatStore();
const username = ref("");
const error = ref("");
const isJoining = ref(false);
const { isConnected, error: wsError, joinChat } = useWebSocket("ws://localhost:3000");
const showConnectionStatus = ref(true);

// Watch for connection and hide the status after connected
watch(isConnected, (connected) => {
  if (connected) {
    showConnectionStatus.value = false;
  } else {
    showConnectionStatus.value = true;
  }
});

const handleJoin = async () => {
  if (username.value.trim()) {
    try {
      isJoining.value = true;
      error.value = "";

      // Wait for connection if needed
      if (!isConnected.value) {
        await new Promise<void>((resolve) => {
          const checkConnection = setInterval(() => {
            if (isConnected.value) {
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);
        });
      }

      // Send join message first and wait for response
      await joinChat(username.value.trim());

      // The server will send a "joined" event which will trigger setCurrentUser in the WebSocket handler
      router.push("/chat/general");
    } catch (e) {
      console.error("Error joining chat:", e);
      error.value = "Failed to join chat. Please try again.";
    } finally {
      isJoining.value = false;
    }
  } else {
    error.value = "Please enter a username";
  }
};

// Clear existing user data on mount
onMounted(() => {
  chatStore.$reset();
});
</script>

<template>
  <div class="home">
    <div v-if="showConnectionStatus && !isConnected" class="connection-status">
      Connecting to server...
    </div>

    <div class="content">
      <h1>Welcome to Chat App</h1>
      <div class="join-form">
        <input
          v-model="username"
          type="text"
          placeholder="Enter your username"
          @keyup.enter="handleJoin"
          :disabled="!isConnected || isJoining"
        />
        <button
          @click="handleJoin"
          :disabled="!isConnected || isJoining"
          class="join-button"
          :class="{ loading: isJoining }"
        >
          {{ isJoining ? "Joining..." : "Join Chat" }}
        </button>
      </div>
      <div v-if="error || wsError" class="error">
        {{ error || wsError }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: #f8f9fa;
}

.connection-status {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.content {
  text-align: center;
  max-width: 400px;
  width: 100%;
  padding: 2rem;
  background-color: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h1 {
  margin-bottom: 2rem;
  color: #2c3e50;
  font-size: 2rem;
}

.join-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #dee2e6;
  border-radius: 0.5rem;
  outline: none;
  transition: all 0.2s;
  font-size: 1rem;
}

input:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

input:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.join-button {
  padding: 0.75rem 1.5rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  min-width: 100px;
}

.join-button:hover:not(:disabled) {
  background-color: #3aa876;
  transform: translateY(-1px);
}

.join-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.join-button.loading {
  position: relative;
  color: transparent;
}

.join-button.loading::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid white;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
  transform: translate(-50%, -50%);
}

.error {
  color: #dc3545;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  padding: 0.5rem;
  background-color: #f8d7da;
  border-radius: 0.25rem;
}

@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>`