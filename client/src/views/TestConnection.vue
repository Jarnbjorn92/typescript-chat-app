<script setup lang="ts">
import { ref } from "vue";
import { useWebSocket } from "../composables/useWebSocket";

const testMessage = ref("");
const lastEvent = ref("");

// Initialize WebSocket connection
const { isConnected, messages, error, sendMessage } = useWebSocket(
  "ws://localhost:3000"
);

// Test functions
const sendTestMessage = () => {
  if (!testMessage.value.trim()) return;

  try {
    sendMessage({
      content: testMessage.value,
      senderId: `TestUser_${Date.now().toString().slice(-4)}`,
      roomId: "general",
      type: "text",
    });
    lastEvent.value = `Attempted to send message: ${testMessage.value}`;
    testMessage.value = "";
  } catch (e) {
    lastEvent.value = `Error sending message: ${
      e instanceof Error ? e.message : "Unknown error"
    }`;
  }
};

const clearMessages = () => {
  messages.value = [];
  lastEvent.value = "Cleared local messages";
};

const getConnectionStatus = () => {
  if (error.value) {
    return "Error";
  }
  return isConnected.value ? "Connected" : "Disconnected";
};
</script>

<template>
  <div class="test-container p-4">
    <h1 class="text-2xl font-bold mb-4">WebSocket Connection Test</h1>

    <!-- Connection Status -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-2">Connection Status</h2>
      <div
        :class="{
          'p-2 rounded': true,
          'bg-green-100 text-green-800': isConnected,
          'bg-red-100 text-red-800': !isConnected,
          'bg-yellow-100 text-yellow-800': error,
        }"
      >
        {{ getConnectionStatus() }}
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mb-6 p-2 bg-red-100 text-red-800 rounded">
      Error: {{ error }}
    </div>

    <!-- Test Controls -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-2">Test Controls</h2>
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <input
            v-model="testMessage"
            type="text"
            placeholder="Type test message"
            class="border p-2 rounded flex-grow"
            @keyup.enter="sendTestMessage"
          />
          <button
            @click="sendTestMessage"
            :disabled="!isConnected"
            class="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send Test Message
          </button>
        </div>

        <button
          @click="clearMessages"
          class="bg-red-500 text-white p-2 rounded hover:bg-red-600"
        >
          Clear Messages
        </button>
      </div>
    </div>

    <!-- Last Event -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-2">Last Event</h2>
      <div class="p-2 bg-gray-100 rounded">
        {{ lastEvent || "No events yet" }}
      </div>
    </div>

    <!-- Messages -->
    <div>
      <h2 class="text-lg font-semibold mb-2">Messages</h2>
      <div class="border rounded p-2 max-h-60 overflow-y-auto">
        <div v-if="messages.length === 0">No messages</div>
        <div
          v-for="message in messages"
          :key="`${message.senderId}-${message.timestamp}`"
          class="mb-2"
        >
          <div class="font-semibold">From: {{ message.senderId }}</div>
          <div class="bg-gray-50 p-2 rounded">{{ message.content }}</div>
          <div class="text-xs text-gray-500">
            {{ new Date(message.timestamp).toLocaleString() }}
          </div>
        </div>
      </div>
    </div>

    <!-- Debug Information -->
    <div class="mt-6">
      <h2 class="text-lg font-semibold mb-2">Debug Information</h2>
      <div class="font-mono text-sm bg-gray-100 p-2 rounded">
        <div>
          Connection Status: {{ isConnected ? "Connected" : "Disconnected" }}
        </div>
        <div>Total Messages: {{ messages.length }}</div>
        <div>Has Error: {{ error ? "Yes" : "No" }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-container {
  max-width: 800px;
  margin: 0 auto;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.messages-container {
  max-height: 400px;
  overflow-y: auto;
}

.message {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
}
</style>
