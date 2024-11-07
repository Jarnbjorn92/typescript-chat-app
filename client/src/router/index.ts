import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ChatView from "../views/ChatView.vue";
import TestConnection from "../views/TestConnection.vue"

const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        name: 'home',
        component: HomeView
      },
      {
        path: '/chat/:roomId',
        name: 'chat',
        component: ChatView
      },
      {
        path: '/test',
        name: 'test',
        component: TestConnection
      },
    ]
  })

  export default router