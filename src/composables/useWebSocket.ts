import { ref, computed, onMounted, onUnmounted } from 'vue';
import { webSocketService } from '@/services/websocket.service';

export function useWebSocket() {
  const isConnected = computed(() => webSocketService.isConnected.value);
  const connectionStatus = computed(() => webSocketService.connectionStatus.value);
  const metrics = ref(webSocketService.getMetrics());

  onMounted(() => {
    // Update metrics periodically
    const interval = setInterval(() => {
      metrics.value = webSocketService.getMetrics();
    }, 5000);

    return () => clearInterval(interval);
  });

  const subscribeToDevice = (deviceId: string) => {
    webSocketService.subscribeToDevice(deviceId);
  };

  const unsubscribeFromDevice = (deviceId: string) => {
    webSocketService.unsubscribeFromDevice(deviceId);
  };

  const sendMessage = (event: string, data: any) => {
    return webSocketService.sendMessage(event, data);
  };

  const onEvent = (event: string, callback: (data: any) => void) => {
    webSocketService.on(event, callback);
    
    // Cleanup on unmount
    onUnmounted(() => {
      webSocketService.off(event, callback);
    });
  };

  const disconnect = () => {
    webSocketService.disconnect();
  };

  return {
    isConnected,
    connectionStatus,
    metrics,
    subscribeToDevice,
    unsubscribeFromDevice,
    sendMessage,
    onEvent,
    disconnect,
    getSocket: () => webSocketService.getSocket()
  };
}

export default useWebSocket;
