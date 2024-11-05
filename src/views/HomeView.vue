<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'

const username = ref('')
const router = useRouter()
const chatStore = useChatStore()

const joinChat = () => {
  if (username.value.trim()) {
    const user = {
      id: crypto.randomUUID(),
      username: username.value,
      isOnline: true
    }
    chatStore.setCurrentUser(user)
    router.push('/chat/general')
  }
}
</script>

<template>
  <div class="home">
    <h1>Welcome to Chat App</h1>
    <div class="join-form">
      <input 
        v-model="username"
        type="text"
        placeholder="Enter your username"
        @keyup.enter="joinChat"
      />
      <button @click="joinChat">Join Chat</button>
    </div>
  </div>
</template>