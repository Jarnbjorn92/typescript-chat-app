import { ref, onMounted, onUnmounted } from "vue";
import type { Message } from "../types";

export function useWebSocket(url: string) {
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const messages = ref<Message[]>([]);

  const connect = () => {
    socket.value = new WebSocket(url);

    socket.value.onopen = () => {
      isConnected.value = true;
      console.log("WebSocket connected");
    };

    socket.value.onmessage = (event) => {
      const message: Message = JSON.parse(event.data);
      messages.value.push(message);
    };

    socket.value.onclose = () => {
      isConnected.value = false;
      console.log("WebSocket disconnected");
    };
  };

  const sendMessage = (message: Omit<Message, "id" | "timestamp">) => {
    if (socket.value?.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(message));
    }
  };

  onMounted(() => connect());
  onUnmounted(() => socket.value?.close());

  return {
    isConnected,
    messages,
    sendMessage,
  };
}
