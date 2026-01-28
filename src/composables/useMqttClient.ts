import { ref, onUnmounted } from 'vue';
import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';

interface MqttMessage {
  topic: string;
  payload: any;
  qos: number;
  retain: boolean;
}

interface MqttEvents {
  onConnect?: () => void;
  onMessage?: (message: MqttMessage) => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

export function useMqttClient(brokerUrl: string, topic: string, deviceId?: string) {
  const client = ref<MqttClient | null>(null);
  const isConnected = ref<boolean>(false);
  const error = ref<Error | null>(null);
  const lastMessage = ref<MqttMessage | null>(null);

  // Generate unique clientId
  const generateClientId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const device = deviceId ? `_${deviceId}` : '';
    return `mqtt_client${device}_${timestamp}_${random}`;
  };

  // Connect to MQTT broker
  const connect = (events?: MqttEvents) => {
    try {
      const clientId = generateClientId();
      
      console.log(`[MQTT] Connecting to ${brokerUrl} with clientId: ${clientId}`);
      
      client.value = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 5000, // 5-second reconnection interval
        keepalive: 60,
        protocolVersion: 5
      });

      // Handle connection
      client.value.on('connect', () => {
        console.log('[MQTT] Connected successfully');
        isConnected.value = true;
        error.value = null;

        // Subscribe to topic with QoS 1
        client.value?.subscribe(topic, { qos: 1 }, (err) => {
          if (err) {
            console.error('[MQTT] Subscription error:', err);
            error.value = err;
          } else {
            console.log(`[MQTT] Subscribed to topic: ${topic} with QoS 1`);
          }
        });

        events?.onConnect?.();
      });

      // Handle incoming messages
      client.value.on('message', (receivedTopic, payload, packet) => {
        try {
          // Parse JSON payload
          let parsedPayload: any;
          try {
            parsedPayload = JSON.parse(payload.toString());
          } catch {
            // If not JSON, use raw string
            parsedPayload = payload.toString();
          }

          const message: MqttMessage = {
            topic: receivedTopic,
            payload: parsedPayload,
            qos: packet.qos,
            retain: packet.retain
          };

          lastMessage.value = message;
          console.log('[MQTT] Message received:', message);

          events?.onMessage?.(message);
        } catch (err) {
          console.error('[MQTT] Error processing message:', err);
        }
      });

      // Handle errors
      client.value.on('error', (err) => {
        console.error('[MQTT] Error:', err);
        error.value = err;
        isConnected.value = false;
        events?.onError?.(err);
      });

      // Handle disconnection
      client.value.on('disconnect', () => {
        console.log('[MQTT] Disconnected');
        isConnected.value = false;
        events?.onDisconnect?.();
      });

      // Handle offline
      client.value.on('offline', () => {
        console.log('[MQTT] Client offline');
        isConnected.value = false;
      });

      // Handle reconnect
      client.value.on('reconnect', () => {
        console.log('[MQTT] Attempting to reconnect...');
        events?.onReconnect?.();
      });

      // Handle close
      client.value.on('close', () => {
        console.log('[MQTT] Connection closed');
        isConnected.value = false;
      });

    } catch (err: any) {
      console.error('[MQTT] Connection error:', err);
      error.value = err;
      isConnected.value = false;
    }
  };

  // Publish message to topic
  const publish = (publishTopic: string, message: any, options?: { qos?: 0 | 1 | 2; retain?: boolean }) => {
    return new Promise<void>((resolve, reject) => {
      if (!client.value || !isConnected.value) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      
      client.value.publish(publishTopic, payload, { qos: options?.qos || 1, retain: options?.retain || false }, (err) => {
        if (err) {
          console.error('[MQTT] Publish error:', err);
          reject(err);
        } else {
          console.log(`[MQTT] Published to ${publishTopic}:`, message);
          resolve();
        }
      });
    });
  };

  // Subscribe to additional topic
  const subscribe = (newTopic: string, qos: 0 | 1 | 2 = 1) => {
    return new Promise<void>((resolve, reject) => {
      if (!client.value) {
        reject(new Error('MQTT client not initialized'));
        return;
      }

      client.value.subscribe(newTopic, { qos }, (err) => {
        if (err) {
          console.error(`[MQTT] Error subscribing to ${newTopic}:`, err);
          reject(err);
        } else {
          console.log(`[MQTT] Subscribed to ${newTopic} with QoS ${qos}`);
          resolve();
        }
      });
    });
  };

  // Unsubscribe from topic
  const unsubscribe = (unsubTopic: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!client.value) {
        reject(new Error('MQTT client not initialized'));
        return;
      }

      client.value.unsubscribe(unsubTopic, (err) => {
        if (err) {
          console.error(`[MQTT] Error unsubscribing from ${unsubTopic}:`, err);
          reject(err);
        } else {
          console.log(`[MQTT] Unsubscribed from ${unsubTopic}`);
          resolve();
        }
      });
    });
  };

  // Cleanup function to end connection
  const disconnect = () => {
    if (client.value) {
      console.log('[MQTT] Disconnecting...');
      client.value.end(true); // Force close
      client.value = null;
      isConnected.value = false;
      error.value = null;
      lastMessage.value = null;
    }
  };

  // Auto cleanup on component unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    client,
    isConnected,
    error,
    lastMessage,
    connect,
    disconnect,
    publish,
    subscribe,
    unsubscribe
  };
}
