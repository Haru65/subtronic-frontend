/**
 * Device Template Type Definitions
 * 
 * Comprehensive TypeScript types for the template-driven device system
 */

export type WidgetType = 'gauge' | 'number' | 'chart' | 'status' | 'fault' | 'trend';
export type SeverityLevel = 'safe' | 'warning' | 'critical';
export type DeviceType = 'gas_detector' | 'pressure_sensor' | 'cathodic_protection' | 'cp_rectifier' | 'temperature_sensor' | 'power_monitor' | 'generic';

/**
 * Severity configuration for telemetry values
 */
export interface SeverityConfig {
  safe: string;      // e.g., "<50"
  warning: string;   // e.g., "50-100"
  critical: string;  // e.g., ">100"
}

/**
 * Widget configuration for telemetry display
 */
export interface WidgetConfig {
  key: string;
  label: string;
  widget: WidgetType;
  unit?: string;
  min?: number;
  max?: number;
  decimals?: number;
  severityLevels?: SeverityConfig;
  icon?: string;
  color?: string;
  chartType?: 'line' | 'area' | 'bar';
  showTrend?: boolean;
}

/**
 * Alarm configuration
 */
export interface AlarmConfig {
  key: string;
  label: string;
  enabled: boolean;
  threshold: number;
  severity: SeverityLevel;
  message?: string;
}

/**
 * Device command configuration
 */
export interface CommandConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  parameters?: Record<string, any>;
  confirmationRequired?: boolean;
  description?: string;
}

/**
 * Device setting configuration
 */
export interface SettingConfig {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'range';
  unit?: string;
  min?: number;
  max?: number;
  options?: Array<{ value: any; label: string }>;
  description?: string;
  category?: string;
}

/**
 * Complete device template
 */
export interface DeviceTemplate {
  deviceType: DeviceType;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  
  // Telemetry schema - defines what data the device sends
  telemetrySchema: WidgetConfig[];
  
  // Widget configuration - how to display telemetry
  widgetConfig: {
    layout: 'grid' | 'rows';
    columns: number;
    widgets: WidgetConfig[];
  };
  
  // Alarm configuration
  alarmConfig: AlarmConfig[];
  
  // Available commands
  commandList: CommandConfig[];
  
  // Device settings schema
  settingsSchema: SettingConfig[];
  
  // Device model information
  deviceModel: {
    manufacturer: string;
    model: string;
    version: string;
    capabilities: string[];
  };
  
  // MQTT configuration
  mqttConfig?: {
    topicPrefix: string;
    dataFormat: 'json' | 'csv' | 'binary';
    qos: 0 | 1 | 2;
  };
}

/**
 * Real-time telemetry data
 */
export interface TelemetryData {
  deviceId: string;
  timestamp: string;
  data: Record<string, number | string | boolean>;
  quality?: 'good' | 'uncertain' | 'bad';
}

/**
 * Device instance with template
 */
export interface TemplatedDevice {
  id: string;
  deviceId: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  lastSeen: string;
  template: DeviceTemplate;
  currentData: Record<string, any>;
  settings: Record<string, any>;
  metadata?: {
    installDate?: string;
    firmwareVersion?: string;
    serialNumber?: string;
    notes?: string;
  };
}

/**
 * Widget rendering context
 */
export interface WidgetRenderContext {
  widget: WidgetConfig;
  value: number | string | boolean;
  previousValue?: number | string | boolean;
  timestamp: string;
  severity: SeverityLevel;
  trend?: number; // percentage change
}

/**
 * Device status summary
 */
export interface DeviceStatusSummary {
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  mqttTopic: string;
  ingestionDelay: number; // milliseconds
  uptime: number; // seconds
  messageCount: number;
  lastMessageTime: string;
}

/**
 * Alert/Fault log entry
 */
export interface AlertLogEntry {
  id: string;
  timestamp: string;
  eventType: 'alarm' | 'fault' | 'reset' | 'acknowledge';
  severity: SeverityLevel;
  message: string;
  value?: number | string;
  parameter?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}