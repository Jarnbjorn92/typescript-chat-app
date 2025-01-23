<script setup lang="ts">
import { computed } from "vue";
import { useChatStore } from "../stores/chat";

const props = defineProps<{
  roomId: string;
}>();

const chatStore = useChatStore();
const currentRoom = computed(() => chatStore.getRoomById(props.roomId));

const participants = computed(
  () =>
    currentRoom.value?.participants.map((p) => {
      const user = chatStore.getUserById(p.userId);
      return {
        ...user,
        role: p.role,
      };
    }) || []
);

const getInitials = (username?: string) => {
  if (!username) return "";
  return username
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};
</script>

<template>
  <div class="active-users">
    <div class="current-user">
      <div class="user-info">
        <span class="username">{{ chatStore.currentUser?.username }}</span>
        <span class="status">Online</span>
      </div>
    </div>

    <div class="room-info" v-if="currentRoom">
      <h3>{{ currentRoom.name }}</h3>
      <span class="participant-count">
        {{ participants.length }} participants
      </span>
    </div>

    <div class="participants-list">
      <div
        v-for="participant in participants"
        :key="participant.id"
        class="participant-item"
      >
        <div
          class="user-avatar"
          :data-initials="getInitials(participant.username)"
        >
          <div
            class="status-indicator"
            :class="{ online: participant.isOnline }"
          ></div>
        </div>
        <div class="user-info">
          <span class="username">
            {{ participant.username }}
            <span v-if="participant.id === chatStore.currentUser?.id"
              >(You)</span
            >
          </span>
          <span class="role">{{ participant.role }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
