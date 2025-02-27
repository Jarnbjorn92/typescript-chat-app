<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from "vue";
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
const messagesContainer = ref<HTMLElement | null>(null);

// Auto-scroll to bottom of messages
const scrollToBottom = () => {
  if (messagesContainer.value) {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop =
          messagesContainer.value.scrollHeight;
      }
    });
  }
};

// Watch for new messages and scroll to bottom
watch(
  () => roomMessages.value.length,
  () => {
    scrollToBottom();
  }
);

// Watch for room changes and scroll to bottom
watch(
  () => props.roomId,
  () => {
    scrollToBottom();
  }
);

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
    const messageContent = newMessage.value.trim();

    sendMessage({
      content: messageContent,
      senderId: chatStore.currentUser.id,
      roomId: props.roomId,
      type: "text",
      status: "sent",
    });

    console.log("Message sent:", messageContent);
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

const getMessageClass = (senderId: string) => {
  const isOwnMessage = senderId === chatStore.currentUser?.id;
  const classNames = ["message"];

  if (isOwnMessage) {
    classNames.push("own-message");
  }

  return classNames.join(" ");
};

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div class="chat-room">
    <div class="room-header" v-if="currentRoom">
      <h2>{{ currentRoom.name }}</h2>
      <div class="participant-count">
        {{ currentRoom.participants?.length || 0 }} participants
      </div>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <div v-if="roomMessages.length === 0" class="empty-messages">
        No messages yet. Start the conversation!
      </div>

      <div
        v-for="message in roomMessages"
        :key="message.id"
        :class="getMessageClass(message.senderId)"
      >
        <div class="message-header">
          {{ getUserDisplayName(message.senderId) }}
        </div>
        <div class="message-bubble" :class="{ pending: message.pending }">
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
      <button
        @click="sendNewMessage"
        :disabled="!isConnected || !newMessage.trim()"
      >
        Send
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f8f9fa;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #dee2e6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.room-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #343a40;
}

.participant-count {
  font-size: 0.875rem;
  color: #6c757d;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-messages {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
  font-style: italic;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  align-self: flex-start;
}

.message-header {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
  padding-left: 0.5rem;
}

.message-bubble {
  background-color: #fff;
  border-radius: 1rem;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
}

.message-bubble.pending {
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6;
}

.message-content {
  word-break: break-word;
  white-space: pre-wrap;
}

.message-metadata {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: #adb5bd;
}

.own-message {
  align-self: flex-end;
}

.own-message .message-header {
  text-align: right;
  padding-right: 0.5rem;
}

.own-message .message-bubble {
  background-color: #d1e7dd;
}

.own-message .message-bubble.pending {
  background-color: rgba(209, 231, 221, 0.5);
  border: 1px dashed #adb5bd;
}

.message-input {
  display: flex;
  padding: 1rem;
  background-color: #fff;
  border-top: 1px solid #dee2e6;
}

.message-input input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  margin-right: 0.5rem;
  outline: none;
}

.message-input input:focus {
  border-color: #86b7fe;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.message-input button {
  padding: 0.75rem 1.5rem;
  background-color: #0d6efd;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.message-input button:hover:not(:disabled) {
  background-color: #0b5ed7;
}

.message-input button:disabled {
  background-color: #6c757d;
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
