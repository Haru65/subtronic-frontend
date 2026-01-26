import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  SubtronicDeviceData,
  SubtronicCommandRequest,
  SubtronicCommandResponse,
  SubtronicDeviceStatus,
  SubtronicHistoricalData,
  SubtronicAlarmEvent,
  SubtronicDeviceConfig,
  SubtronicApiError,
  SubtronicCommandType,
  SubtronicCommandParameters
} from '@/types/subtronic.types';

/**
 * Subtronic API Service
 * 
 * Handles communication with Subtronic device endpoints:
 * - /subtronic/devices/{id}/data
 * - /subtronic/devices/{id}/commands
 * - /subtronic/devices/{id}/status
 * - /subtronic/devices/{id}/history
 */
class SubtronicService {
  private api: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUBTRONIC_API_URL || 'http://localhost:3001';
    
    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        console.log(`🔌 [Subtronic API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('🚨 [Subtronic API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ [Subtronic API] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('🚨 [Subtronic API] Response error:', error);
        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format API error response
   */
  private formatError(error: any): SubtronicApiError {
    if (error.response?.data) {
      return error.response.data as SubtronicApiError;
    }
    
    return {
      error_code: 'NETWORK_ERROR',
      error_message: error.message || 'Network error occurred',
      timestamp: new Date().toISOString(),
      request_id: error.config?.headers?.['X-Request-ID'] || 'unknown'
    };
  }

  /**
   * Get real-time device data
   * GET /subtronic/devices/{id}/data
   */
  async getDeviceData(deviceId: string): Promise<SubtronicDeviceData> {
    try {
      const response: AxiosResponse<SubtronicDeviceData> = await this.api.get(
        `/subtronic/devices/${deviceId}/data`
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to get device data for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get device status summary
   * GET /subtronic/devices/{id}/status
   */
  async getDeviceStatus(deviceId: string): Promise<SubtronicDeviceStatus> {
    try {
      const response: AxiosResponse<SubtronicDeviceStatus> = await this.api.get(
        `/subtronic/devices/${deviceId}/status`
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to get device status for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get historical data
   * GET /subtronic/devices/{id}/history
   */
  async getDeviceHistory(
    deviceId: string,
    startDate: string,
    endDate: string,
    interval?: string
  ): Promise<SubtronicHistoricalData[]> {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      
      if (interval) {
        params.append('interval', interval);
      }

      const response: AxiosResponse<SubtronicHistoricalData[]> = await this.api.get(
        `/subtronic/devices/${deviceId}/history?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to get device history for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Execute device command
   * POST /subtronic/devices/{id}/commands
   */
  async executeCommand<T extends SubtronicCommandType>(
    deviceId: string,
    commandType: T,
    parameters: T extends keyof SubtronicCommandParameters 
      ? SubtronicCommandParameters[T] 
      : Record<string, any>,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      timeout?: number;
      retryCount?: number;
      scheduledTime?: string;
    }
  ): Promise<SubtronicCommandResponse> {
    try {
      const commandRequest: SubtronicCommandRequest = {
        command_id: this.generateCommandId(),
        command_type: commandType,
        parameters: parameters as Record<string, any>,
        priority: options?.priority || 'normal',
        timeout: options?.timeout || 30,
        retry_count: options?.retryCount || 3,
        scheduled_time: options?.scheduledTime
      };

      const response: AxiosResponse<SubtronicCommandResponse> = await this.api.post(
        `/subtronic/devices/${deviceId}/commands`,
        commandRequest
      );
      
      console.log(`📤 [Subtronic] Command sent: ${commandType} to device ${deviceId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to execute command ${commandType} on device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get command status
   * GET /subtronic/devices/{id}/commands/{commandId}
   */
  async getCommandStatus(deviceId: string, commandId: string): Promise<SubtronicCommandResponse> {
    try {
      const response: AxiosResponse<SubtronicCommandResponse> = await this.api.get(
        `/subtronic/devices/${deviceId}/commands/${commandId}`
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to get command status for ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Get device configuration
   * GET /subtronic/devices/{id}/config
   */
  async getDeviceConfig(deviceId: string): Promise<SubtronicDeviceConfig> {
    try {
      const response: AxiosResponse<SubtronicDeviceConfig> = await this.api.get(
        `/subtronic/devices/${deviceId}/config`
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to get device config for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update device configuration
   * PUT /subtronic/devices/{id}/config
   */
  async updateDeviceConfig(
    deviceId: string, 
    config: Partial<SubtronicDeviceConfig>
  ): Promise<SubtronicDeviceConfig> {
    try {
      const response: AxiosResponse<SubtronicDeviceConfig> = await this.api.put(
        `/subtronic/devices/${deviceId}/config`,
        config
      );
      
      console.log(`⚙️ [Subtronic] Configuration updated for device ${deviceId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to update device config for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get device alarms
   * GET /subtronic/devices/{id}/alarms
   */
  async getDeviceAlarms(
    deviceId: string,
    options?: {
      active_only?: boolean;
      start_date?: string;
      end_date?: string;
      severity?: 'info' | 'warning' | 'critical';
    }
  ): Promise<SubtronicAlarmEvent[]> {
    try {
      const params = new URLSearchParams();
      
      if (options?.active_only) params.append('active_only', 'true');
      if (options?.start_date) params.append('start_date', options.start_date);
      if (options?.end_date) params.append('end_date', options.end_date);
      if (options?.severity) params.append('severity', options.severity);

      const response: AxiosResponse<SubtronicAlarmEvent[]> = await this.api.get(
        `/subtronic/devices/${deviceId}/alarms?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to get device alarms for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Acknowledge alarm
   * POST /subtronic/devices/{id}/alarms/{alarmId}/acknowledge
   */
  async acknowledgeAlarm(
    deviceId: string, 
    alarmId: string, 
    acknowledgedBy: string
  ): Promise<void> {
    try {
      await this.api.post(
        `/subtronic/devices/${deviceId}/alarms/${alarmId}/acknowledge`,
        { acknowledged_by: acknowledgedBy }
      );
      
      console.log(`✅ [Subtronic] Alarm ${alarmId} acknowledged for device ${deviceId}`);
    } catch (error) {
      console.error(`Failed to acknowledge alarm ${alarmId}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods for common commands

  /**
   * Restart device
   */
  async restartDevice(deviceId: string): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'restart_device', {}, {
      priority: 'high',
      timeout: 60
    });
  }

  /**
   * Set measurement mode
   */
  async setMeasurementMode(
    deviceId: string, 
    mode: 'normal' | 'interrupt' | 'instant' | 'survey',
    autoStart: boolean = true
  ): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'set_measurement_mode', {
      mode,
      auto_start: autoStart
    });
  }

  /**
   * Set interrupt parameters
   */
  async setInterruptParameters(
    deviceId: string,
    onTime: number,
    offTime: number,
    cycles: number
  ): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'set_interrupt_parameters', {
      on_time: onTime,
      off_time: offTime,
      cycles
    });
  }

  /**
   * Set alarm thresholds
   */
  async setAlarmThresholds(
    deviceId: string,
    thresholds: {
      potential_high?: number;
      potential_low?: number;
      current_high?: number;
      current_low?: number;
    }
  ): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'set_alarm_thresholds', thresholds);
  }

  /**
   * Take instant reading
   */
  async takeInstantReading(deviceId: string): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'take_instant_reading', {}, {
      priority: 'high',
      timeout: 30
    });
  }

  /**
   * Calibrate potential
   */
  async calibratePotential(
    deviceId: string,
    referenceValue: number,
    calibrationType: 'offset' | 'gain' | 'two_point' = 'offset'
  ): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'calibrate_potential', {
      reference_value: referenceValue,
      calibration_type: calibrationType
    }, {
      priority: 'high',
      timeout: 120
    });
  }

  /**
   * Export data
   */
  async exportData(
    deviceId: string,
    startDate: string,
    endDate: string,
    format: 'csv' | 'json' | 'xml' = 'csv'
  ): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'export_data', {
      start_date: startDate,
      end_date: endDate,
      format,
      include_alarms: true,
      include_diagnostics: true
    }, {
      priority: 'low',
      timeout: 300
    });
  }

  /**
   * Run diagnostics
   */
  async runDiagnostics(deviceId: string): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'run_diagnostics', {}, {
      priority: 'normal',
      timeout: 180
    });
  }

  /**
   * Reset all alarms
   */
  async resetAlarms(deviceId: string): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'reset_alarms', {});
  }

  /**
   * Set electrode type
   */
  async setElectrodeType(
    deviceId: string,
    type: 'cu_cuso4' | 'ag_agcl' | 'zinc' | 'custom',
    customOffset?: number
  ): Promise<SubtronicCommandResponse> {
    const parameters: any = { type };
    if (type === 'custom' && customOffset !== undefined) {
      parameters.custom_offset = customOffset;
    }
    
    return this.executeCommand(deviceId, 'set_electrode_type', parameters);
  }

  /**
   * Set logging interval
   */
  async setLoggingInterval(
    deviceId: string,
    interval: number,
    syncToHour: boolean = false
  ): Promise<SubtronicCommandResponse> {
    return this.executeCommand(deviceId, 'set_logging_interval', {
      interval,
      sync_to_hour: syncToHour
    });
  }
}

// Export singleton instance
export const subtronicService = new SubtronicService();
export default subtronicService;