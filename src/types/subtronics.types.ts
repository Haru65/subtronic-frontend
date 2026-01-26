/**
 * Subtronics Gas Monitor (OTSM-2) Type Definitions
 * 
 * Normalized data model for Subtronics Gas Monitor telemetry
 */

// Normalized Subtronics telemetry data
export interface SubtronicsDeviceData {
  // Device Info
  device_name: string;
  serial_number: string;
  gas_type: string;
  timestamp: string;
  unit: string;
  message_type: string;
  sender: string;
  
  // Core Readings
  sensor_reading: number; // Current gas concentration from "Sensor Reading"
  alarm_status: string; // Overall alarm status: "NORMAL", "ALARM"
  offset: number;
  span_high: number;
  span_low: number;
  a1_level: number;
  a2_level: number;
  a3_level: number;
  decimal_point: number;
  
  // Alarm Configuration
  a1_type: string;
  a1_hysteresis: number;
  a1_latching: number;
  a1_siren: number;
  a1_buzzer: number;
  
  // Alarm LED Status
  alarm1_led: number;
  alarm2_led: number;
  alarm3_led: number;
  sensor_fault: number;
  
  // Location
  latitude: string;
  longitude: string;
  
  // Metadata
  raw_message?: any;
  processed_at: string;
  data_quality: 'good' | 'uncertain' | 'bad' | 'offline';
}

// Raw Subtronics payload structure (as received from MQTT)
// Supports both old format (Device Alise Name, no Sensor Reading) and new format (Device Alias Name, with Sensor Reading)
export interface SubtronicsRawPayload {
  "Device Alias Name"?: string; // New format
  "Device Alise Name"?: string; // Old format (typo in original)
  "OTSM-2 Serial Number": string;
  "Gas": string;
  "timestamp": string;
  "Sender": string;
  "Message Type": string;
  "Unit of Measurement": string;
  "Sensor Reading"?: number; // Optional - only in new format
  "Alarm Status"?: string; // Optional - only in new format
  "Parameters": {
    "Offset": number; // Used as sensor reading in old format
    "Span High": number;
    "Span Low": number;
    "Alarm Level A1": number;
    "Alarm Level A2": number;
    "Alarm Level A3": number;
    "Decimal Point": number;
    "A1Type": string;
    "A1Hysterysis": number;
    "A1Latching": number;
    "A1Siren": number;
    "A1Buzzer": number;
    "Alarm 1 LED Status": number;
    "Alarm 2 LED Status": number;
    "Alarm 3 LED Status": number;
    "SensorFault": number;
    "lat": string;
    "long": string;
  };
}

// Subtronics alert/alarm data
export interface SubtronicsAlert {
  id: string;
  type: 'sensor_fault' | 'alarm_level_1' | 'alarm_level_2' | 'alarm_level_3';
  severity: 'info' | 'warning' | 'high' | 'critical';
  message: string;
  timestamp: string;
  device_name: string;
  serial_number: string;
  threshold?: number;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

// Widget configuration for Subtronics devices
export interface SubtronicsWidgetConfig {
  key: string;
  label: string;
  widget: 'gauge' | 'number' | 'status' | 'led';
  unit?: string;
  min?: number;
  max?: number;
  decimals?: number;
  icon?: string;
  color?: string;
  severityLevels?: {
    safe?: string;
    warning?: string;
    critical?: string;
  };
}

// Device template for Subtronics Gas Monitor
export interface SubtronicsDeviceTemplate {
  device_type: 'subtronics_gas_monitor';
  model_info: {
    manufacturer: 'Subtronics';
    model: 'OTSM-2';
    series: 'Gas Monitor';
    description: 'Subtronics Gas Detection Monitor';
  };
  
  // Widget mappings for UI display
  widget_mappings: {
    gas_concentration: SubtronicsWidgetConfig;
    temperature: SubtronicsWidgetConfig;
    humidity: SubtronicsWidgetConfig;
    battery: SubtronicsWidgetConfig;
    offset: SubtronicsWidgetConfig;
    span_high: SubtronicsWidgetConfig;
    span_low: SubtronicsWidgetConfig;
    a1_level: SubtronicsWidgetConfig;
    a2_level: SubtronicsWidgetConfig;
    a3_level: SubtronicsWidgetConfig;
    alarm1_led: SubtronicsWidgetConfig;
    alarm2_led: SubtronicsWidgetConfig;
    alarm3_led: SubtronicsWidgetConfig;
    sensor_fault: SubtronicsWidgetConfig;
  };
  
  // Alarm thresholds
  alarm_thresholds: {
    a1_level: number;
    a2_level: number;
    a3_level: number;
  };
  
  // Supported commands (if any)
  supported_commands: string[];
}

// API response types
export interface SubtronicsApiResponse<T> {
  data: T;
  timestamp: string;
  status: 'success' | 'error';
  message?: string;
}

export interface SubtronicsApiError {
  error_code: string;
  error_message: string;
  timestamp: string;
  request_id?: string;
}

// Service configuration
export interface SubtronicsServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  refreshInterval: number;
}

// Chart data for historical trends
export interface SubtronicsChartData {
  timestamp: string;
  gas_concentration: number;
  temperature?: number;
  humidity?: number;
  alarm_status: number; // 0=normal, 1=A1, 2=A2, 3=A3
}

// Device status summary
export interface SubtronicsDeviceStatus {
  device_id: string;
  device_name: string;
  serial_number: string;
  online: boolean;
  last_seen: string;
  gas_type: string;
  current_reading?: number;
  alarm_status: 'normal' | 'alarm1' | 'alarm2' | 'alarm3' | 'fault';
  sensor_fault: boolean;
  battery_level: number; // Placeholder until real data available
  signal_strength: number; // Placeholder
  uptime: number;
  location: {
    latitude: string;
    longitude: string;
  };
}

// Database schema representation
export interface SubtronicsDbSchema {
  id: number;
  device_id: number;
  device_name: string;
  serial_number: string;
  gas_type: string;
  timestamp: Date;
  unit: string;
  offset: number;
  span_high: number;
  span_low: number;
  a1_level: number;
  a2_level: number;
  a3_level: number;
  decimal_point: number;
  a1_type: string;
  a1_hysteresis: number;
  a1_latching: number;
  a1_siren: number;
  a1_buzzer: number;
  alarm1_led: number;
  alarm2_led: number;
  alarm3_led: number;
  sensor_fault: number;
  latitude: string;
  longitude: string;
  raw_message: any;
  created_at: Date;
  updated_at: Date;
}

// Validation rules
export interface SubtronicsValidationRules {
  device_name: {
    required: boolean;
    maxLength: number;
  };
  serial_number: {
    required: boolean;
    pattern: RegExp;
  };
  gas_type: {
    required: boolean;
    allowedValues: string[];
  };
  span_high: {
    required: boolean;
    min: number;
    max: number;
  };
  alarm_levels: {
    a1_level: { min: number; max: number };
    a2_level: { min: number; max: number };
    a3_level: { min: number; max: number };
  };
}

// Export utility types
export type SubtronicsAlarmLevel = 'a1' | 'a2' | 'a3';
export type SubtronicsLedStatus = 0 | 1;
export type SubtronicsDataQuality = 'good' | 'uncertain' | 'bad' | 'offline';
export type SubtronicsAlarmSeverity = 'info' | 'warning' | 'high' | 'critical';