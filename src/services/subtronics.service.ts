import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  SubtronicsDeviceData,
  SubtronicsAlert,
  SubtronicsDeviceStatus,
  SubtronicsChartData,
  SubtronicsApiResponse,
  SubtronicsApiError,
  SubtronicsServiceConfig
} from '@/types/subtronics.types';

/**
 * Subtronics Gas Monitor API Service
 * 
 * Handles communication with Subtronics device endpoints:
 * - /devices/{id}/subtronics/telemetry/latest
 * - /devices/{id}/subtronics/alerts
 * - /devices/{id}/subtronics/status
 */
class SubtronicsService {
  private api: AxiosInstance;
  private config: SubtronicsServiceConfig;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_SUBTRONICS_API_URL || 'http://localhost:3002',
      timeout: 30000,
      retryAttempts: 3,
      refreshInterval: 30000
    };
    
    this.api = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
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
        
        console.log(`🔌 [Subtronics API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('🚨 [Subtronics API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ [Subtronics API] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('🚨 [Subtronics API] Response error:', error);
        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `subtronics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format API error response
   */
  private formatError(error: any): SubtronicsApiError {
    if (error.response?.data) {
      return error.response.data as SubtronicsApiError;
    }
    
    return {
      error_code: 'NETWORK_ERROR',
      error_message: error.message || 'Network error occurred',
      timestamp: new Date().toISOString(),
      request_id: error.config?.headers?.['X-Request-ID'] || 'unknown'
    };
  }

  /**
   * Get latest telemetry data for Subtronics device
   * GET /devices/{deviceId}/subtronics/telemetry/latest
   */
  async getLatestTelemetry(deviceId: string): Promise<SubtronicsDeviceData> {
    try {
      const response: AxiosResponse<SubtronicsDeviceData> = await this.api.get(
        `/devices/${deviceId}/subtronics/telemetry/latest`
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to get Subtronics telemetry for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get device alerts
   * GET /devices/{deviceId}/subtronics/alerts
   */
  async getDeviceAlerts(deviceId: string): Promise<SubtronicsAlert[]> {
    try {
      const response: AxiosResponse<SubtronicsAlert[]> = await this.api.get(
        `/devices/${deviceId}/subtronics/alerts`
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to get Subtronics alerts for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   * POST /devices/{deviceId}/subtronics/alerts/{alertId}/acknowledge
   */
  async acknowledgeAlert(
    deviceId: string, 
    alertId: string, 
    acknowledgedBy: string
  ): Promise<void> {
    try {
      await this.api.post(
        `/devices/${deviceId}/subtronics/alerts/${alertId}/acknowledge`,
        { acknowledged_by: acknowledgedBy }
      );
      
      console.log(`✅ [Subtronics] Alert ${alertId} acknowledged for device ${deviceId}`);
    } catch (error) {
      console.error(`Failed to acknowledge Subtronics alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Get device status summary
   */
  async getDeviceStatus(deviceId: string): Promise<SubtronicsDeviceStatus> {
    try {
      // Get latest telemetry to derive status
      const telemetry = await this.getLatestTelemetry(deviceId);
      const alerts = await this.getDeviceAlerts(deviceId);
      
      // Determine alarm status
      let alarmStatus: SubtronicsDeviceStatus['alarm_status'] = 'normal';
      if (telemetry.sensor_fault === 1) {
        alarmStatus = 'fault';
      } else if (telemetry.alarm3_led === 1) {
        alarmStatus = 'alarm3';
      } else if (telemetry.alarm2_led === 1) {
        alarmStatus = 'alarm2';
      } else if (telemetry.alarm1_led === 1) {
        alarmStatus = 'alarm1';
      }
      
      // Calculate uptime (mock for now)
      const lastSeen = new Date(telemetry.timestamp);
      const now = new Date();
      const uptimeMs = now.getTime() - lastSeen.getTime();
      const uptimeSeconds = Math.max(0, Math.floor(uptimeMs / 1000));
      
      const status: SubtronicsDeviceStatus = {
        device_id: deviceId,
        device_name: telemetry.device_name,
        serial_number: telemetry.serial_number,
        online: telemetry.data_quality === 'good',
        last_seen: telemetry.timestamp,
        gas_type: telemetry.gas_type,
        alarm_status: alarmStatus,
        sensor_fault: telemetry.sensor_fault === 1,
        battery_level: 85, // Placeholder
        signal_strength: -65, // Placeholder
        uptime: uptimeSeconds,
        location: {
          latitude: telemetry.latitude,
          longitude: telemetry.longitude
        }
      };
      
      return status;
    } catch (error) {
      console.error(`Failed to get Subtronics device status for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get historical chart data (mock implementation)
   */
  async getChartData(
    deviceId: string,
    startDate: string,
    endDate: string,
    interval: string = '1h'
  ): Promise<SubtronicsChartData[]> {
    try {
      // For now, generate mock historical data
      // In production, this would call a real API endpoint
      const data: SubtronicsChartData[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const intervalMs = this.parseInterval(interval);
      
      for (let time = start.getTime(); time <= end.getTime(); time += intervalMs) {
        const timestamp = new Date(time).toISOString();
        
        // Generate realistic gas concentration data
        const baseConcentration = 50 + Math.sin(time / (1000 * 60 * 60 * 24)) * 20; // Daily cycle
        const noise = (Math.random() - 0.5) * 10;
        const gasConcentration = Math.max(0, baseConcentration + noise);
        
        // Determine alarm status based on concentration
        let alarmStatus = 0;
        if (gasConcentration > 1000) alarmStatus = 3;
        else if (gasConcentration > 500) alarmStatus = 2;
        else if (gasConcentration > 250) alarmStatus = 1;
        
        data.push({
          timestamp,
          gas_concentration: Math.round(gasConcentration * 10) / 10,
          temperature: 20 + Math.random() * 10,
          humidity: 40 + Math.random() * 20,
          alarm_status: alarmStatus
        });
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to get Subtronics chart data for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Parse interval string to milliseconds
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // Default 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000;
    }
  }

  /**
   * Test connection to backend
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Subtronics backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Trigger test data publication (for development)
   */
  async publishTestData(deviceId: string): Promise<void> {
    try {
      await this.api.post(`/test/subtronics/${deviceId}`);
      console.log(`📤 [Subtronics] Test data published for device ${deviceId}`);
    } catch (error) {
      console.error(`Failed to publish test data for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Parse raw Subtronics payload (utility method)
   */
  parseRawPayload(rawPayload: any): SubtronicsDeviceData | null {
    try {
      // This would typically be done on the backend, but included for completeness
      const data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
      
      const params = data["Parameters"] || {};
      
      return {
        device_name: data["Device Alise Name"] || "Unknown Device",
        serial_number: data["OTSM-2 Serial Number"] || "Unknown",
        gas_type: data["Gas"] || "Unknown Gas",
        timestamp: data["timestamp"] || new Date().toISOString(),
        unit: (data["Unit of Measurement "] || "ppm").trim(),
        message_type: data["Message Type"] || "LOG DATA",
        sender: data["Sender"] || "Device",
        
        offset: parseInt(params["Offset"]) || 0,
        span_high: parseInt(params["Span High"]) || 0,
        span_low: parseInt(params["Span Low"]) || 0,
        a1_level: parseInt(params["Alarm Level A1"]) || 0,
        a2_level: parseInt(params["Alarm Level A2"]) || 0,
        a3_level: parseInt(params["Alarm Level A3"]) || 0,
        decimal_point: parseInt(params["Decimal Point"]) || 0,
        
        a1_type: params["A1Type"] || "High",
        a1_hysteresis: parseInt(params["A1Hysterysis"]) || 0,
        a1_latching: parseInt(params["A1Latching"]) || 0,
        a1_siren: parseInt(params["A1Siren"]) || 0,
        a1_buzzer: parseInt(params["A1Buzzer"]) || 0,
        
        alarm1_led: parseInt(params["Alarm 1 LED Status"]) || 0,
        alarm2_led: parseInt(params["Alarm 2 LED Status"]) || 0,
        alarm3_led: parseInt(params["Alarm 3 LED Status"]) || 0,
        sensor_fault: parseInt(params["SensorFault"]) || 0,
        
        latitude: params["lat"] || "0.00",
        longitude: params["long"] || "0.00",
        
        raw_message: data,
        processed_at: new Date().toISOString(),
        data_quality: 'good'
      };
    } catch (error) {
      console.error('Error parsing Subtronics payload:', error);
      return null;
    }
  }

  /**
   * Validate telemetry data
   */
  validateTelemetryData(data: SubtronicsDeviceData): boolean {
    // Basic validation rules
    if (!data.device_name || !data.serial_number || !data.gas_type) {
      return false;
    }
    
    if (data.span_high <= data.span_low) {
      return false;
    }
    
    if (data.a1_level >= data.a2_level || data.a2_level >= data.a3_level) {
      return false;
    }
    
    return true;
  }

  /**
   * Get configuration
   */
  getConfig(): SubtronicsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SubtronicsServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance if baseURL changed
    if (newConfig.baseUrl) {
      this.api.defaults.baseURL = newConfig.baseUrl;
    }
    
    if (newConfig.timeout) {
      this.api.defaults.timeout = newConfig.timeout;
    }
  }
}

// Export singleton instance
export const subtronicsService = new SubtronicsService();
export default subtronicsService;