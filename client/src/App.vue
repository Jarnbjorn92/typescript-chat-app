<script setup lang="ts">
</script>

<template>
  <nav class="navigation">
    <RouterLink to="/">Home</RouterLink> |
    <RouterLink to="/test">Test Connection</RouterLink>
  </nav>
  
  <RouterView />
</template>

<style scoped>
.navigation {
  padding: 1rem;
  background-color: #f8f9fa;
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
</style>