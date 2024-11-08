<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <nav class="navigation">
      <RouterLink to="/">Home</RouterLink> |
      <RouterLink to="/test">Test Connection</RouterLink>
    </nav>
    
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.navigation {
  padding: 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  flex-shrink: 0;
}

.navigation a {
  margin: 0 0.5rem;
  color: #2c3e50;
  text-decoration: none;
}

.navigation a.router-link-active {
  color: #42b983;
  font-weight: bold;
}

.main-content {
  flex: 1;
  overflow-y: auto; /* Allows content to scroll if needed */
  height: 0; /* Forces content to respect flex parent */
}
</style>

<style>
body {
  margin: 0;
  padding: 0;
  height: 100vh;
}

#app {
  height: 100%;
}
</style>