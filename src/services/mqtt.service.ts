import { io, Socket } from 'socket.io-client';
import ApiService from '@/core/services/ApiService';

export interface MqttMessage {
  text: string;
  type: 'individual' | 'broadcast';
  targetDevice?: string;
  timestamp: string;
}

export interface DeviceCommand {
  commandType: 'interrupt_mode' | 'normal_mode' | 'manual_mode' | 'dpol_mode' | 'inst_mode';
  deviceId: string;
  parameters: any;
  timestamp: string;
}

export interface InterruptModeConfig {
  startDate: string;
  startTime: string;
  stopDate: string;
  stopTime: string;
  onTime: number; // seconds
  offTime: number; // seconds
  dateFormat?: {
    dd?: string;
    mm?: string;
    yy?: string;
    HH?: string;
    MM?: string;
    ss?: string;
  };
}

export interface TimerConfig {
  ton: {
    field1: string;
    field2: string;
    field3: string;
    field4: string;
    field5: string;
    field6: string;
  };
  toff: {
    field1: string;
    field2: string;
    field3: string;
    field4: string;
    field5: string;
    field6: string;
  };
}

export interface AlarmConfig {
  setup?: {
    value?: string | number;
    threshold?: string | number;
    enabled?: boolean;
  };
  setop?: {
    value?: string | number;
    threshold?: string | number;
    enabled?: boolean;
  };
  reffcal?: {
    value?: string | number;
    calibration?: string | number;
    enabled?: boolean;
  };
}

export interface MessageResponse {
  success: boolean;
  error?: string;
  messageId?: string;
}

class MqttService {
  private socket: Socket | null = null;
  // Use environment variable for backend URL, fallback to localhost for development
  private readonly BACKEND_URL = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';

  initialize(): Socket {
    if (!this.socket) {
      console.log('🔌 Connecting to Socket.IO backend:', this.BACKEND_URL);
      this.socket = io(this.BACKEND_URL, {
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        path: '/socket.io',
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        upgrade: true
      });

      this.socket.on('connect', () => {
        console.log('MQTT Service connected to backend');
      });

      this.socket.on('disconnect', () => {
        console.log('MQTT Service disconnected from backend');
      });

      this.socket.on('messageDelivered', (data) => {
        console.log('Message delivery confirmation:', data);
      });

      this.socket.on('messageError', (error) => {
        console.error('Message delivery error:', error);
      });
    }
    return this.socket;
  }

  // Device configuration methods using API calls
  /**
   * ALL methods now send COMPLETE settings frame in the format:
   * {
   *   "Device ID": "123",
   *   "Message Type": "settings",
   *   "sender": "Server",
   *   "CommandId": "uuid",
   *   "Parameters": { ...complete settings with updated fields... }
   * }
   */

  /**
   * Configure interrupt mode - sends complete settings with updated interrupt fields
   */
  async configureInterruptMode(deviceId: string, config: InterruptModeConfig) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(`api/devices/${deviceId}/configure/interrupt-mode`, config);
      console.log('✅ Interrupt mode configured - complete settings frame sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to configure interrupt mode:', error);
      throw new Error(error?.response?.data?.message || 'Failed to configure interrupt mode');
    }
  }

  /**
   * Set manual mode - sends complete settings with manual mode action
   */
  async setManualMode(deviceId: string, action: 'start' | 'stop') {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(`api/devices/${deviceId}/configure/manual-mode`, { action });
      console.log(`✅ Manual mode ${action} - complete settings frame sent`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to set manual mode:', error);
      throw new Error(error?.response?.data?.message || 'Failed to configure manual mode');
    }
  }

  /**
   * Set normal mode - sends complete settings with normal mode configuration
   */
  async setNormalMode(deviceId: string, config: any = {}) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(`api/devices/${deviceId}/configure/normal-mode`, config);
      console.log('✅ Normal mode configured - complete settings frame sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to set normal mode:', error);
      throw new Error(error?.response?.data?.message || 'Failed to configure normal mode');
    }
  }

  /**
   * Set DPOL mode - sends complete settings with updated DPOL fields
   */
  async setDpolMode(deviceId: string, config: any) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(`api/devices/${deviceId}/configure/dpol-mode`, config);
      console.log('✅ DPOL mode configured - complete settings frame sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to set DPOL mode:', error);
      throw new Error(error?.response?.data?.message || 'Failed to configure DPOL mode');
    }
  }

  /**
   * Set instant mode - sends complete settings with instant mode configuration
   */
  async setInstMode(deviceId: string, config: any) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(`api/devices/${deviceId}/configure/inst-mode`, config);
      console.log('✅ Instant mode configured - complete settings frame sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to set INST mode:', error);
      throw new Error(error?.response?.data?.message || 'Failed to configure INST mode');
    }
  }

  /**
   * Set timer configuration - sends complete settings with timer fields
   */
  async setTimerConfiguration(deviceId: string, config: TimerConfig) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(`api/devices/${deviceId}/configure/timer`, config);
      console.log('✅ Timer configured - complete settings frame sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to set timer configuration:', error);
      throw new Error(error?.response?.data?.message || 'Failed to configure timer');
    }
  }

  /**
   * Set electrode configuration - sends complete settings with electrode type
   */
  async setElectrodeConfiguration(deviceId: string, electrodeType: string) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(`api/devices/${deviceId}/configure/electrode`, { electrodeType });
      console.log(`✅ Electrode type ${electrodeType} - complete settings frame sent`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to set electrode configuration:', error);
      throw new Error(error?.response?.data?.message || 'Failed to configure electrode');
    }
  }

  /**
   * Set alarm configuration - sends complete settings with alarm thresholds
   */
  async setAlarmConfiguration(deviceId: string, config: AlarmConfig) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(`api/devices/${deviceId}/configure/alarm`, config);
      console.log('✅ Alarm configured - complete settings frame sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to set alarm configuration:', error);
      throw new Error(error?.response?.data?.message || 'Failed to configure alarm');
    }
  }

  /**
   * Get current device settings in complete frame format
   */
  async getDeviceSettings(deviceId: string) {
    try {
      ApiService.setHeader();
      const response = await ApiService.get(`api/devices/${deviceId}/settings`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get device settings:', error);
      throw new Error(error?.response?.data?.message || 'Failed to get device settings');
    }
  }

  /**
   * Update complete device settings (sends entire payload)
   */
  async updateDeviceSettings(deviceId: string, settingsData: any) {
    try {
      ApiService.setHeader();
      const response = await ApiService.put(`api/devices/${deviceId}/settings`, settingsData);
      console.log('✅ Complete device settings updated and sent');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to update device settings:', error);
      throw new Error(error?.response?.data?.message || 'Failed to update device settings');
    }
  }

  /**
   * Update a single setting (sends complete payload with changed setting)
   */
  async updateSingleSetting(deviceId: string, setting: string, value: any) {
    try {
      ApiService.setHeader();
      const response = await ApiService.patch(`api/devices/${deviceId}/settings`, { setting, value });
      console.log(`✅ Setting '${setting}' updated - complete settings frame sent`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Failed to update setting '${setting}':`, error);
      throw new Error(error?.response?.data?.message || `Failed to update setting '${setting}'`);
    }
  }

  /**
   * Get device status (legacy method)
   */
  async getDeviceStatus(deviceId: string) {
    try {
      ApiService.setHeader();
      const response = await ApiService.get(`api/devices/${deviceId}/status`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get device status:', error);
      throw new Error(error?.response?.data?.message || 'Failed to get device status');
    }
  }

  // Legacy methods for backward compatibility
  async sendMessage(message: MqttMessage): Promise<MessageResponse> {
    if (!this.socket || !this.socket.connected) {
      return {
        success: false,
        error: 'Not connected to MQTT service'
      };
    }

    return new Promise((resolve) => {
      this.socket!.emit('sendMessage', message, (response: MessageResponse) => {
        resolve(response);
      });
    });
  }

  async sendDeviceCommand(command: DeviceCommand): Promise<MessageResponse> {
    if (!this.socket || !this.socket.connected) {
      return {
        success: false,
        error: 'Not connected to MQTT service'
      };
    }

    return new Promise((resolve) => {
      this.socket!.emit('sendDeviceCommand', command, (response: MessageResponse) => {
        resolve(response);
      });
    });
  }

  async setInterruptMode(deviceId: string, config: InterruptModeConfig): Promise<MessageResponse> {
    const command: DeviceCommand = {
      commandType: 'interrupt_mode',
      deviceId: deviceId,
      parameters: {
        mode: 'interrupt',
        schedule: {
          startDateTime: `${config.startDate} ${config.startTime}`,
          stopDateTime: `${config.stopDate} ${config.stopTime}`,
          onTimeSeconds: parseInt(config.onTime.toString()),
          offTimeSeconds: parseInt(config.offTime.toString())
        },
        dateFormat: config.dateFormat
      },
      timestamp: new Date().toISOString()
    };

    return this.sendDeviceCommand(command);
  }

  /**
   * Save device settings to database
   * This merges new settings with existing ones and saves to database
   * Used after user changes settings to persist them
   */
  async saveSettingsToDatabase(deviceId: string, settings: any): Promise<any> {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(
        `/api/device-management/${deviceId}/settings/merge`,
        {
          settings,
          updatedBy: 'user'
        }
      );
      console.log('💾 Settings saved to database:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to save settings to database:', error);
      // Don't throw - this is non-critical and settings were already sent to device
      return {
        success: false,
        error: error?.response?.data?.message || 'Failed to save settings'
      };
    }
  }

  /**
   * Get device settings from database
   */
  async getSettingsFromDatabase(deviceId: string): Promise<any> {
    try {
      ApiService.setHeader();
      const response = await ApiService.get(`/api/device-management/${deviceId}/settings`);
      console.log('📋 Settings retrieved from database:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get settings from database:', error);
      throw new Error(error?.response?.data?.message || 'Failed to get settings');
    }
  }

  /**
   * Send complete settings payload (used after staging updates in cache)
   * This method accepts a complete payload with all fields, including non-updated ones
   */
  async sendCompleteSettingsPayload(deviceId: string, completePayload: any) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(
        `/api/devices/${deviceId}/settings/complete`,
        completePayload
      );
      console.log('✅ Complete settings payload sent successfully:', response.data);
      
      // Ensure response has success flag for frontend to detect
      const result = response.data || {};
      if (result.success !== false) {
        result.success = true;
      }
      return result;
    } catch (error: any) {
      console.error('❌ Failed to send complete settings payload:', error);
      return {
        success: false,
        error: error?.response?.data?.message || 'Failed to send settings'
      };
    }
  }

  /**
   * Batch multiple setting updates and send as complete payload
   * Useful for applying multiple changes at once
   */
  async batchUpdateSettings(deviceId: string, updates: Record<string, any>) {
    try {
      ApiService.setHeader();
      const response = await ApiService.post(
        `/api/devices/${deviceId}/settings/batch`,
        { updates }
      );
      console.log('✅ Batch settings updates sent successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to batch update settings:', error);
      throw new Error(error?.response?.data?.message || 'Failed to batch update settings');
    }
  }

  /**
   * Get only the staging methods from cache
   * Import the cache store and call these methods before sending
   */
  getStagingHint() {
    return {
      hint: 'Use the deviceSettingsCache store methods to stage updates before sending',
      methods: [
        'stageSettingUpdate(deviceId, key, value)',
        'stageMultipleUpdates(deviceId, updates)',
        'getCompleteSettingsPayload(deviceId)',
        'getStagedChanges(deviceId)',
        'hasStagedChanges(deviceId)',
        'clearStagedChanges(deviceId)'
      ]
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const mqttService = new MqttService();
export default mqttService;
