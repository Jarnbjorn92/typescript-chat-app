<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useChatStore } from "../stores/chat";

const router = useRouter();
const chatStore = useChatStore();
const username = ref("");
const error = ref("");

const joinChat = () => {
  if (username.value.trim()) {
    const user = {
      id: `user-${Date.now()}`,
      username: username.value.trim(),
      isOnline: true,
    };
    chatStore.setCurrentUser(user);
    router.push("/chat/general");
  } else {
    error.value = "Please enter a username";
  }
};
</script>

<template>
  <div class="home">
    <div class="content">
      <h1>Welcome to my Chat App!</h1>
      <div class="join-form">
        <input
          v-model="username"
          type="text"
          placeholder="Enter your username"
          @keyup.enter="joinChat"
        />
        <button @click="joinChat">Join</button>
      </div>
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.content {
  text-align: center;
  max-width: 400px;
  width: 100%;
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
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #42b983;
}

button {
  padding: 0.75rem 1.5rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #3aa876;
}

.error {
  color: #dc3545;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}
</style>
