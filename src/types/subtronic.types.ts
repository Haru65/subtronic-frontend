/**
 * Subtronic Device API Type Definitions
 * 
 * Types for integrating with Subtronic device endpoints:
 * - /subtronic/devices/{id}/data
 * - /subtronic/devices/{id}/commands
 */

export type SubtronicDeviceType = 'cathodic_protection' | 'cp_rectifier' | 'monitoring_station' | 'reference_electrode';
export type SubtronicCommandStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'timeout';
export type SubtronicDataQuality = 'good' | 'uncertain' | 'bad' | 'offline';

/**
 * Subtronic Device Data Response
 * GET /subtronic/devices/{id}/data
 */
export interface SubtronicDeviceData {
  deviceId: string;
  timestamp: string;
  quality: SubtronicDataQuality;
  
  // Cathodic Protection Measurements
  measurements: {
    // Potential measurements (mV)
    potential_on?: number;
    potential_off?: number;
    potential_instant?: number;
    potential_native?: number;
    
    // Current measurements (mA)
    current_protection?: number;
    current_rectifier?: number;
    current_drain?: number;
    
    // Resistance measurements (Ohm)
    resistance_structure?: number;
    resistance_electrolyte?: number;
    resistance_anode?: number;
    
    // Environmental
    temperature?: number;
    humidity?: number;
    
    // System status
    battery_voltage?: number;
    solar_voltage?: number;
    signal_strength?: number;
    
    // Digital inputs/outputs
    digital_inputs?: boolean[];
    digital_outputs?: boolean[];
    
    // Alarm states
    alarm_potential_high?: boolean;
    alarm_potential_low?: boolean;
    alarm_current_high?: boolean;
    alarm_current_low?: boolean;
    alarm_system_fault?: boolean;
    alarm_communication?: boolean;
  };
  
  // Device configuration
  configuration: {
    electrode_type: 'cu_cuso4' | 'ag_agcl' | 'zinc' | 'custom';
    measurement_mode: 'normal' | 'interrupt' | 'instant' | 'survey';
    logging_interval: number; // seconds
    interrupt_settings?: {
      on_time: number; // seconds
      off_time: number; // seconds
      cycles: number;
    };
    
    // Alarm thresholds
    thresholds: {
      potential_high: number; // mV
      potential_low: number; // mV
      current_high: number; // mA
      current_low: number; // mA
    };
  };
  
  // Device status
  status: {
    operational_state: 'normal' | 'alarm' | 'fault' | 'maintenance' | 'offline';
    last_communication: string;
    uptime: number; // seconds
    firmware_version: string;
    hardware_revision: string;
  };
  
  // Location and installation info
  location: {
    latitude?: number;
    longitude?: number;
    elevation?: number;
    site_name: string;
    installation_date: string;
    pipeline_details?: {
      diameter: number; // mm
      material: string;
      coating_type: string;
      burial_depth: number; // meters
    };
  };
}

/**
 * Subtronic Command Request
 * POST /subtronic/devices/{id}/commands
 */
export interface SubtronicCommandRequest {
  command_id: string;
  command_type: SubtronicCommandType;
  parameters: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeout: number; // seconds
  retry_count?: number;
  scheduled_time?: string; // ISO timestamp for delayed execution
}

/**
 * Subtronic Command Response
 */
export interface SubtronicCommandResponse {
  command_id: string;
  device_id: string;
  status: SubtronicCommandStatus;
  submitted_at: string;
  started_at?: string;
  completed_at?: string;
  result?: any;
  error_message?: string;
  progress?: number; // 0-100
}

/**
 * Available Subtronic Command Types
 */
export type SubtronicCommandType = 
  // System commands
  | 'restart_device'
  | 'factory_reset'
  | 'firmware_update'
  | 'sync_time'
  | 'reboot_modem'
  
  // Measurement commands
  | 'start_measurement'
  | 'stop_measurement'
  | 'take_instant_reading'
  | 'calibrate_potential'
  | 'calibrate_current'
  | 'zero_calibration'
  
  // Configuration commands
  | 'set_measurement_mode'
  | 'set_logging_interval'
  | 'set_interrupt_parameters'
  | 'set_alarm_thresholds'
  | 'set_electrode_type'
  
  // Alarm commands
  | 'acknowledge_alarm'
  | 'reset_alarms'
  | 'test_alarm'
  | 'silence_alarm'
  
  // Data commands
  | 'download_logs'
  | 'clear_logs'
  | 'export_data'
  | 'backup_configuration'
  | 'restore_configuration'
  
  // Diagnostic commands
  | 'run_diagnostics'
  | 'test_communication'
  | 'check_system_health'
  | 'measure_loop_resistance';

/**
 * Command Parameter Schemas
 */
export interface SubtronicCommandParameters {
  // Measurement mode parameters
  set_measurement_mode: {
    mode: 'normal' | 'interrupt' | 'instant' | 'survey';
    auto_start?: boolean;
  };
  
  // Interrupt parameters
  set_interrupt_parameters: {
    on_time: number; // seconds
    off_time: number; // seconds
    cycles: number;
    start_delay?: number; // seconds
  };
  
  // Logging interval
  set_logging_interval: {
    interval: number; // seconds
    sync_to_hour?: boolean;
  };
  
  // Alarm thresholds
  set_alarm_thresholds: {
    potential_high?: number; // mV
    potential_low?: number; // mV
    current_high?: number; // mA
    current_low?: number; // mA
    hysteresis?: number; // mV or mA
  };
  
  // Electrode type
  set_electrode_type: {
    type: 'cu_cuso4' | 'ag_agcl' | 'zinc' | 'custom';
    custom_offset?: number; // mV if custom type
  };
  
  // Calibration parameters
  calibrate_potential: {
    reference_value: number; // mV
    calibration_type: 'offset' | 'gain' | 'two_point';
    high_point?: number;
    low_point?: number;
  };
  
  // Data export parameters
  export_data: {
    start_date: string; // ISO date
    end_date: string; // ISO date
    format: 'csv' | 'json' | 'xml';
    include_alarms?: boolean;
    include_diagnostics?: boolean;
  };
  
  // Firmware update
  firmware_update: {
    firmware_url: string;
    version: string;
    force_update?: boolean;
    backup_current?: boolean;
  };
}

/**
 * Subtronic Device Template Configuration
 */
export interface SubtronicDeviceTemplate {
  device_type: SubtronicDeviceType;
  model_info: {
    manufacturer: 'Subtronic';
    model: string;
    series: string;
    capabilities: string[];
  };
  
  // API endpoints
  endpoints: {
    data: string; // /subtronic/devices/{id}/data
    commands: string; // /subtronic/devices/{id}/commands
    status: string; // /subtronic/devices/{id}/status
    history: string; // /subtronic/devices/{id}/history
  };
  
  // Data mapping for UI widgets
  data_mapping: {
    [key: string]: {
      source_field: string;
      widget_type: 'gauge' | 'number' | 'status' | 'chart';
      unit?: string;
      min?: number;
      max?: number;
      severity_levels?: {
        safe: string;
        warning: string;
        critical: string;
      };
    };
  };
  
  // Available commands for this device type
  supported_commands: SubtronicCommandType[];
  
  // Configuration schema
  configuration_schema: {
    [key: string]: {
      type: 'number' | 'string' | 'boolean' | 'select';
      label: string;
      description?: string;
      min?: number;
      max?: number;
      options?: Array<{ value: any; label: string }>;
      unit?: string;
      category: string;
    };
  };
}

/**
 * Subtronic API Error Response
 */
export interface SubtronicApiError {
  error_code: string;
  error_message: string;
  details?: Record<string, any>;
  timestamp: string;
  request_id: string;
}

/**
 * Subtronic Device Status Summary
 */
export interface SubtronicDeviceStatus {
  device_id: string;
  online: boolean;
  last_seen: string;
  communication_quality: 'excellent' | 'good' | 'poor' | 'offline';
  signal_strength: number; // dBm
  battery_level: number; // percentage
  active_alarms: number;
  operational_hours: number;
  next_maintenance: string;
}

/**
 * Subtronic Historical Data Point
 */
export interface SubtronicHistoricalData {
  timestamp: string;
  measurements: Record<string, number>;
  quality: SubtronicDataQuality;
  alarms: string[];
  events: string[];
}

/**
 * Subtronic Alarm Event
 */
export interface SubtronicAlarmEvent {
  alarm_id: string;
  device_id: string;
  alarm_type: 'potential_high' | 'potential_low' | 'current_high' | 'current_low' | 'system_fault' | 'communication';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
  triggered_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  cleared_at?: string;
  auto_cleared: boolean;
}

/**
 * Subtronic Device Configuration
 */
export interface SubtronicDeviceConfig {
  device_id: string;
  site_configuration: {
    site_name: string;
    location: {
      latitude: number;
      longitude: number;
      elevation?: number;
    };
    installation_details: {
      installation_date: string;
      installer: string;
      commissioning_date: string;
      warranty_expiry: string;
    };
  };
  
  measurement_configuration: {
    electrode_type: 'cu_cuso4' | 'ag_agcl' | 'zinc' | 'custom';
    measurement_mode: 'normal' | 'interrupt' | 'instant' | 'survey';
    logging_interval: number;
    interrupt_settings?: {
      on_time: number;
      off_time: number;
      cycles: number;
    };
  };
  
  alarm_configuration: {
    enabled: boolean;
    thresholds: {
      potential_high: number;
      potential_low: number;
      current_high: number;
      current_low: number;
    };
    notification_settings: {
      email_enabled: boolean;
      sms_enabled: boolean;
      email_recipients: string[];
      sms_recipients: string[];
    };
  };
  
  communication_configuration: {
    reporting_interval: number;
    heartbeat_interval: number;
    retry_attempts: number;
    timeout: number;
  };
}