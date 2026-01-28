import { io, Socket } from 'socket.io-client';
import { ref } from 'vue';

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp?: string;
}

interface DeviceData {
  deviceId: string;
  data: any;
  timestamp: string;
}

interface DeviceAlert {
  deviceId: string;
  alerts: any[];
}

class WebSocketService {
  private socket: Socket | null = null;
  private readonly BACKEND_URL = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';
  
  // Reactive state
  public isConnected = ref<boolean>(false);
  public connectionStatus = ref<string>('disconnected');
  public connectedClients = ref<number>(0);

  /**
   * Initialize WebSocket connection
   */
  initialize(): Socket {
    if (this.socket?.connected) {
      console.log('🔌 WebSocket already connected');
      return this.socket;
    }

    try {
      console.log('🔌 Initializing WebSocket connection to:', this.BACKEND_URL);
      
      this.socket = io(this.BACKEND_URL, {
        transports: ['websocket', 'polling'],
        path: '/socket.io',
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        upgrade: true,
        closeOnBeforeunload: true
      });

      this._setupEventHandlers();
      
      return this.socket;
    } catch (error) {
      console.error('❌ WebSocket initialization error:', error);
      this.connectionStatus.value = 'error';
      throw error;
    }
  }

  /**
   * Setup all event handlers
   */
  private _setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected.value = true;
      this.connectionStatus.value = 'connected';
      console.log('✅ WebSocket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: string) => {
      this.isConnected.value = false;
      this.connectionStatus.value = 'disconnected';
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error: any) => {
      this.connectionStatus.value = 'error';
      console.error('⚠️  WebSocket connection error:', error);
    });

    this.socket.on('reconnect_attempt', () => {
      this.connectionStatus.value = 'reconnecting';
      console.log('🔄 WebSocket reconnection attempt...');
    });

    // Device data events
    this.socket.on('device:data', (data: DeviceData) => {
      console.log('📡 Received device data:', data.deviceId, data);
      // Dispatch to Pinia store if available
      this._dispatchToStore('device:data', data);
    });

    // Device alert events
    this.socket.on('device:alerts', (data: DeviceAlert) => {
      console.log('🚨 Received device alerts:', data.deviceId, data);
      this._dispatchToStore('device:alerts', data);
    });

    // Custom message events
    this.socket.on('message', (message: WebSocketMessage) => {
      console.log('💬 Received message:', message);
      this._dispatchToStore('message', message);
    });

    // Broadcasting events
    this.socket.on('broadcast:message', (data: any) => {
      console.log('📢 Broadcast message received:', data);
      this._dispatchToStore('broadcast:message', data);
    });

    this.socket.on('messageNotification', (data: any) => {
      console.log('🔔 Message notification:', data);
      this._dispatchToStore('messageNotification', data);
    });
  }

  /**
   * Subscribe to device updates
   */
  subscribeToDevice(deviceId: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️  WebSocket not connected, cannot subscribe to device');
      return;
    }
    
    console.log(`📡 Subscribing to device ${deviceId}`);
    this.socket.emit('subscribe:device', deviceId);
  }

  /**
   * Unsubscribe from device updates
   */
  unsubscribeFromDevice(deviceId: string): void {
    if (!this.socket?.connected) return;
    
    console.log(`📡 Unsubscribing from device ${deviceId}`);
    this.socket.emit('unsubscribe:device', deviceId);
  }

  /**
   * Send a message through WebSocket
   */
  sendMessage(event: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket!.emit(event, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Get socket instance for custom event handling
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnectedStatus(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected.value = false;
      this.connectionStatus.value = 'disconnected';
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Dispatch store updates (for Pinia integration)
   */
  private _dispatchToStore(event: string, data: any): void {
    // Dispatch to store if available
    try {
      const storeEvent = new CustomEvent('websocket:' + event, { detail: data });
      window.dispatchEvent(storeEvent);
    } catch (error) {
      console.error('Error dispatching to store:', error);
    }
  }

  /**
   * Register custom event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.socket) {
      this.initialize();
    }
    this.socket?.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      isConnected: this.isConnected.value,
      connectionStatus: this.connectionStatus.value,
      socketId: this.socket?.id,
      backendUrl: this.BACKEND_URL
    };
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

export default WebSocketService;
