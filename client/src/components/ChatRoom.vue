<script setup lang="ts">
import { ref, computed } from "vue";
import { useWebSocket } from "../composables/useWebSocket";
import { useChatStore } from "../stores/chat";

const props = defineProps<{
  roomId: string;
}>();

const currentRoom = computed(() => chatStore.getRoomById(props.roomId));
const roomMessages = computed(() => chatStore.messagesByRoom(props.roomId));

const chatStore = useChatStore();
const { sendMessage, isConnected } = useWebSocket("ws://localhost:3000");
const newMessage = ref("");

const sendNewMessage = () => {
  if (
    !newMessage.value.trim() ||
    !isConnected.value ||
    !chatStore.currentUser
  ) {
    console.log("Send conditions not met:", {
      messageEmpty: !newMessage.value.trim(),
      notConnected: !isConnected.value,
      noUser: !chatStore.currentUser,
    });
    return;
  }

  try {
    sendMessage({
      content: newMessage.value,
      senderId: chatStore.currentUser.id,
      roomId: props.roomId,
      type: "text",
      status: "sent",
    });
    console.log("Message sent:", newMessage.value);
    newMessage.value = "";
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

const getUserDisplayName = (senderId: string) => {
  const user = chatStore.getUserById(senderId);
  return user?.username || "Unknown User";
};

const formatTime = (timestamp: Date) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
</script>

<template>
  <div class="chat-room">
    <div class="room-header" v-if="currentRoom">
      <h2>{{ currentRoom.name }}</h2>
    </div>

    <div class="messages-container">
      <div
        v-for="message in roomMessages"
        :key="message.id"
        :class="[
          'message',
          { 'own-message': message.senderId === chatStore.currentUser?.id },
        ]"
      >
        <div class="message-header">
          {{ getUserDisplayName(message.senderId) }}
        </div>
        <div class="message-bubble">
          <div class="message-content">{{ message.content }}</div>
          <div class="message-metadata">
            <span class="message-status" v-if="message.status">
              {{ message.status }}
            </span>
            <span class="message-time">
              {{ formatTime(message.timestamp) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="message-input">
      <input
        v-model="newMessage"
        type="text"
        placeholder="Type a message..."
        @keyup.enter="sendNewMessage"
        :disabled="!isConnected"
      />
      <button @click="sendNewMessage" :disabled="!isConnected">Send</button>
    </div>
  </div>
</template>
