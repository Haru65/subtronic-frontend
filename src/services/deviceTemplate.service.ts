import type { DeviceTemplate, DeviceType } from '@/types/deviceTemplate.types';

/**
 * Device Template Service
 * 
 * Manages device templates for different device types.
 * Templates define how devices should be rendered and controlled.
 */
class DeviceTemplateService {
  private templates: Map<DeviceType, DeviceTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Get template for a specific device type
   */
  getTemplate(deviceType: DeviceType): DeviceTemplate | null {
    return this.templates.get(deviceType) || null;
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): DeviceTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Register a new template
   */
  registerTemplate(template: DeviceTemplate): void {
    this.templates.set(template.deviceType, template);
  }

  /**
   * Initialize default templates for supported device types
   */
  private initializeDefaultTemplates(): void {
    // Gas Detector Template
    this.registerTemplate({
      deviceType: 'gas_detector',
      displayName: 'Gas Detector',
      description: 'Multi-gas detection sensor with real-time monitoring and alarm capabilities',
      icon: 'bi bi-shield-exclamation',
      color: '#e74c3c',
      
      telemetrySchema: [
        {
          key: 'gas_ppm',
          label: 'Gas Concentration',
          widget: 'gauge',
          unit: 'ppm',
          min: 0,
          max: 200,
          decimals: 0,
          severityLevels: {
            safe: '<50',
            warning: '50-100',
            critical: '>100'
          },
          icon: 'bi bi-cloud',
          color: '#e74c3c'
        },
        {
          key: 'temperature',
          label: 'Temperature',
          widget: 'number',
          unit: '°C',
          decimals: 1,
          icon: 'bi bi-thermometer',
          color: '#f39c12'
        },
        {
          key: 'humidity',
          label: 'Humidity',
          widget: 'number',
          unit: '%',
          decimals: 0,
          icon: 'bi bi-droplet',
          color: '#3498db'
        },
        {
          key: 'battery',
          label: 'Battery Level',
          widget: 'gauge',
          unit: '%',
          min: 0,
          max: 100,
          decimals: 0,
          severityLevels: {
            safe: '>40',
            warning: '20-40',
            critical: '<20'
          },
          icon: 'bi bi-battery',
          color: '#27ae60'
        }
      ],

      widgetConfig: {
        layout: 'grid',
        columns: 2,
        widgets: [
          {
            key: 'gas_ppm',
            label: 'Gas Concentration',
            widget: 'gauge',
            unit: 'ppm',
            min: 0,
            max: 200,
            decimals: 0,
            severityLevels: {
              safe: '<50',
              warning: '50-100',
              critical: '>100'
            },
            icon: 'bi bi-cloud',
            color: '#e74c3c'
          },
          {
            key: 'temperature',
            label: 'Temperature',
            widget: 'number',
            unit: '°C',
            decimals: 1,
            icon: 'bi bi-thermometer',
            color: '#f39c12'
          },
          {
            key: 'humidity',
            label: 'Humidity',
            widget: 'number',
            unit: '%',
            decimals: 0,
            icon: 'bi bi-droplet',
            color: '#3498db'
          },
          {
            key: 'battery',
            label: 'Battery Level',
            widget: 'gauge',
            unit: '%',
            min: 0,
            max: 100,
            decimals: 0,
            severityLevels: {
              safe: '>40',
              warning: '20-40',
              critical: '<20'
            },
            icon: 'bi bi-battery',
            color: '#27ae60'
          }
        ]
      },

      alarmConfig: [
        {
          key: 'gas_alarm',
          label: 'Gas Concentration Alarm',
          enabled: true,
          threshold: 100,
          severity: 'critical',
          message: 'Gas concentration exceeded critical threshold'
        },
        {
          key: 'battery_alarm',
          label: 'Low Battery Alarm',
          enabled: true,
          threshold: 20,
          severity: 'warning',
          message: 'Battery level is low'
        }
      ],

      commandList: [
        {
          key: 'restart',
          label: 'Restart Device',
          icon: 'bi bi-arrow-clockwise',
          color: 'primary',
          confirmationRequired: true,
          description: 'Restart the gas detector device'
        },
        {
          key: 'reset_alarm',
          label: 'Reset Alarm',
          icon: 'bi bi-bell-slash',
          color: 'warning',
          description: 'Reset active alarms'
        },
        {
          key: 'calibrate',
          label: 'Calibrate Sensor',
          icon: 'bi bi-gear',
          color: 'info',
          confirmationRequired: true,
          description: 'Perform sensor calibration'
        },
        {
          key: 'test_alarm',
          label: 'Test Alarm',
          icon: 'bi bi-bell',
          color: 'danger',
          description: 'Test alarm functionality'
        }
      ],

      settingsSchema: [
        {
          key: 'threshold_warning',
          label: 'Warning Threshold',
          type: 'number',
          unit: 'ppm',
          min: 10,
          max: 150,
          description: 'Gas concentration level that triggers warning',
          category: 'Alarms'
        },
        {
          key: 'threshold_critical',
          label: 'Critical Threshold',
          type: 'number',
          unit: 'ppm',
          min: 50,
          max: 200,
          description: 'Gas concentration level that triggers critical alarm',
          category: 'Alarms'
        },
        {
          key: 'sampling_rate',
          label: 'Sampling Rate',
          type: 'select',
          unit: 'seconds',
          options: [
            { value: 10, label: '10 seconds' },
            { value: 30, label: '30 seconds' },
            { value: 60, label: '1 minute' },
            { value: 300, label: '5 minutes' }
          ],
          description: 'How often the sensor takes readings',
          category: 'Measurement'
        },
        {
          key: 'alarm_enabled',
          label: 'Alarm Enabled',
          type: 'boolean',
          description: 'Enable or disable alarm notifications',
          category: 'Alarms'
        }
      ],

      deviceModel: {
        manufacturer: 'Zeptac',
        model: 'GD-2000',
        version: '2.1',
        capabilities: ['gas_detection', 'temperature', 'humidity', 'wireless', 'battery_powered']
      },

      mqttConfig: {
        topicPrefix: 'gas_detectors',
        dataFormat: 'json',
        qos: 1
      }
    });

    // Pressure Sensor Template
    this.registerTemplate({
      deviceType: 'pressure_sensor',
      displayName: 'Pressure Sensor',
      description: 'High-precision pressure monitoring with trend analysis',
      icon: 'bi bi-speedometer2',
      color: '#3498db',

      telemetrySchema: [
        {
          key: 'pressure',
          label: 'Pressure',
          widget: 'gauge',
          unit: 'bar',
          min: 0,
          max: 10,
          decimals: 2,
          severityLevels: {
            safe: '2-8',
            warning: '1-2,8-9',
            critical: '<1,>9'
          },
          icon: 'bi bi-speedometer2',
          color: '#3498db'
        },
        {
          key: 'temperature',
          label: 'Temperature',
          widget: 'number',
          unit: '°C',
          decimals: 1,
          icon: 'bi bi-thermometer',
          color: '#f39c12'
        },
        {
          key: 'flow_rate',
          label: 'Flow Rate',
          widget: 'chart',
          unit: 'L/min',
          decimals: 1,
          chartType: 'line',
          icon: 'bi bi-arrow-right',
          color: '#9b59b6'
        }
      ],

      widgetConfig: {
        layout: 'grid',
        columns: 3,
        widgets: [
          {
            key: 'pressure',
            label: 'Pressure',
            widget: 'gauge',
            unit: 'bar',
            min: 0,
            max: 10,
            decimals: 2,
            severityLevels: {
              safe: '2-8',
              warning: '1-2,8-9',
              critical: '<1,>9'
            },
            icon: 'bi bi-speedometer2',
            color: '#3498db'
          },
          {
            key: 'temperature',
            label: 'Temperature',
            widget: 'number',
            unit: '°C',
            decimals: 1,
            icon: 'bi bi-thermometer',
            color: '#f39c12'
          },
          {
            key: 'flow_rate',
            label: 'Flow Rate',
            widget: 'chart',
            unit: 'L/min',
            decimals: 1,
            chartType: 'line',
            icon: 'bi bi-arrow-right',
            color: '#9b59b6'
          }
        ]
      },

      alarmConfig: [
        {
          key: 'pressure_high',
          label: 'High Pressure Alarm',
          enabled: true,
          threshold: 9,
          severity: 'critical',
          message: 'Pressure exceeded safe operating range'
        },
        {
          key: 'pressure_low',
          label: 'Low Pressure Alarm',
          enabled: true,
          threshold: 1,
          severity: 'warning',
          message: 'Pressure below minimum threshold'
        }
      ],

      commandList: [
        {
          key: 'restart',
          label: 'Restart',
          icon: 'bi bi-arrow-clockwise',
          color: 'primary',
          confirmationRequired: true
        },
        {
          key: 'zero_calibration',
          label: 'Zero Calibration',
          icon: 'bi bi-bullseye',
          color: 'info',
          confirmationRequired: true
        },
        {
          key: 'span_calibration',
          label: 'Span Calibration',
          icon: 'bi bi-rulers',
          color: 'info',
          confirmationRequired: true
        },
        {
          key: 'reset_alarms',
          label: 'Reset Alarms',
          icon: 'bi bi-bell-slash',
          color: 'warning'
        }
      ],

      settingsSchema: [
        {
          key: 'pressure_unit',
          label: 'Pressure Unit',
          type: 'select',
          options: [
            { value: 'bar', label: 'Bar' },
            { value: 'psi', label: 'PSI' },
            { value: 'kpa', label: 'kPa' },
            { value: 'mpa', label: 'MPa' }
          ],
          description: 'Unit for pressure measurements',
          category: 'Display'
        },
        {
          key: 'high_alarm_threshold',
          label: 'High Pressure Alarm',
          type: 'number',
          unit: 'bar',
          min: 5,
          max: 10,
          description: 'Pressure level that triggers high alarm',
          category: 'Alarms'
        },
        {
          key: 'low_alarm_threshold',
          label: 'Low Pressure Alarm',
          type: 'number',
          unit: 'bar',
          min: 0,
          max: 5,
          description: 'Pressure level that triggers low alarm',
          category: 'Alarms'
        },
        {
          key: 'measurement_interval',
          label: 'Measurement Interval',
          type: 'select',
          unit: 'seconds',
          options: [
            { value: 1, label: '1 second' },
            { value: 5, label: '5 seconds' },
            { value: 10, label: '10 seconds' },
            { value: 30, label: '30 seconds' }
          ],
          description: 'How often measurements are taken',
          category: 'Measurement'
        }
      ],

      deviceModel: {
        manufacturer: 'Zeptac',
        model: 'PS-1000',
        version: '1.5',
        capabilities: ['pressure_measurement', 'temperature', 'flow_rate', 'ethernet', 'modbus']
      },

      mqttConfig: {
        topicPrefix: 'pressure_sensors',
        dataFormat: 'json',
        qos: 1
      }
    });

    // Cathodic Protection Template
    this.registerTemplate({
      deviceType: 'cathodic_protection',
      displayName: 'Cathodic Protection System',
      description: 'Corrosion protection monitoring with potential and current measurements',
      icon: 'bi bi-shield-check',
      color: '#27ae60',

      telemetrySchema: [
        {
          key: 'potential',
          label: 'Pipe Potential',
          widget: 'gauge',
          unit: 'V',
          min: -2,
          max: 0,
          decimals: 3,
          severityLevels: {
            safe: '-1.2 to -0.85',
            warning: '-0.85 to -0.8, -1.5 to -1.2',
            critical: '>-0.8, <-1.5'
          },
          icon: 'bi bi-lightning',
          color: '#f39c12'
        },
        {
          key: 'current',
          label: 'Protection Current',
          widget: 'number',
          unit: 'mA',
          decimals: 1,
          icon: 'bi bi-activity',
          color: '#e74c3c'
        },
        {
          key: 'resistance',
          label: 'Soil Resistance',
          widget: 'number',
          unit: 'Ω',
          decimals: 0,
          icon: 'bi bi-diagram-3',
          color: '#9b59b6'
        },
        {
          key: 'temperature',
          label: 'Temperature',
          widget: 'number',
          unit: '°C',
          decimals: 1,
          icon: 'bi bi-thermometer',
          color: '#17a2b8'
        }
      ],

      widgetConfig: {
        layout: 'grid',
        columns: 2,
        widgets: [
          {
            key: 'potential',
            label: 'Pipe Potential',
            widget: 'gauge',
            unit: 'V',
            min: -2,
            max: 0,
            decimals: 3,
            severityLevels: {
              safe: '-1.2 to -0.85',
              warning: '-0.85 to -0.8, -1.5 to -1.2',
              critical: '>-0.8, <-1.5'
            },
            icon: 'bi bi-lightning',
            color: '#f39c12'
          },
          {
            key: 'current',
            label: 'Protection Current',
            widget: 'number',
            unit: 'mA',
            decimals: 1,
            icon: 'bi bi-activity',
            color: '#e74c3c'
          },
          {
            key: 'resistance',
            label: 'Soil Resistance',
            widget: 'number',
            unit: 'Ω',
            decimals: 0,
            icon: 'bi bi-diagram-3',
            color: '#9b59b6'
          },
          {
            key: 'temperature',
            label: 'Temperature',
            widget: 'number',
            unit: '°C',
            decimals: 1,
            icon: 'bi bi-thermometer',
            color: '#17a2b8'
          }
        ]
      },

      alarmConfig: [
        {
          key: 'potential_alarm',
          label: 'Potential Out of Range',
          enabled: true,
          threshold: -0.8,
          severity: 'critical',
          message: 'Pipe potential outside protection range'
        },
        {
          key: 'current_alarm',
          label: 'Current Anomaly',
          enabled: true,
          threshold: 100,
          severity: 'warning',
          message: 'Protection current abnormal'
        }
      ],

      commandList: [
        {
          key: 'restart',
          label: 'Restart System',
          icon: 'bi bi-arrow-clockwise',
          color: 'primary',
          confirmationRequired: true
        },
        {
          key: 'interrupt_mode',
          label: 'Interrupt Mode',
          icon: 'bi bi-pause-circle',
          color: 'warning',
          description: 'Enable interrupt measurement mode'
        },
        {
          key: 'normal_mode',
          label: 'Normal Mode',
          icon: 'bi bi-play-circle',
          color: 'success',
          description: 'Return to normal operation mode'
        },
        {
          key: 'calibrate_reference',
          label: 'Calibrate Reference',
          icon: 'bi bi-bullseye',
          color: 'info',
          confirmationRequired: true
        }
      ],

      settingsSchema: [
        {
          key: 'electrode_type',
          label: 'Reference Electrode',
          type: 'select',
          options: [
            { value: 'cu_cuso4', label: 'Cu/CuSO4' },
            { value: 'ag_agcl', label: 'Ag/AgCl' },
            { value: 'zinc', label: 'Zinc' }
          ],
          description: 'Type of reference electrode used',
          category: 'Measurement'
        },
        {
          key: 'measurement_mode',
          label: 'Measurement Mode',
          type: 'select',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'interrupt', label: 'Interrupt' },
            { value: 'instant', label: 'Instant' }
          ],
          description: 'Operating mode for measurements',
          category: 'Measurement'
        },
        {
          key: 'logging_interval',
          label: 'Logging Interval',
          type: 'select',
          unit: 'minutes',
          options: [
            { value: 1, label: '1 minute' },
            { value: 5, label: '5 minutes' },
            { value: 15, label: '15 minutes' },
            { value: 60, label: '1 hour' }
          ],
          description: 'How often data is logged',
          category: 'Data'
        }
      ],

      deviceModel: {
        manufacturer: 'Zeptac',
        model: 'CP-3000',
        version: '3.2',
        capabilities: ['cathodic_protection', 'potential_measurement', 'current_measurement', 'gsm', 'solar_powered']
      },

      mqttConfig: {
        topicPrefix: 'cp_systems',
        dataFormat: 'json',
        qos: 2
      }
    });

    // Generic Template (fallback)
    this.registerTemplate({
      deviceType: 'generic',
      displayName: 'Generic Device',
      description: 'Generic IoT device with basic monitoring capabilities',
      icon: 'bi bi-cpu',
      color: '#6c757d',

      telemetrySchema: [
        {
          key: 'value1',
          label: 'Value 1',
          widget: 'number',
          decimals: 2,
          icon: 'bi bi-1-circle',
          color: '#007bff'
        },
        {
          key: 'value2',
          label: 'Value 2',
          widget: 'number',
          decimals: 2,
          icon: 'bi bi-2-circle',
          color: '#28a745'
        },
        {
          key: 'status',
          label: 'Status',
          widget: 'status',
          icon: 'bi bi-info-circle',
          color: '#17a2b8'
        }
      ],

      widgetConfig: {
        layout: 'grid',
        columns: 3,
        widgets: [
          {
            key: 'value1',
            label: 'Value 1',
            widget: 'number',
            decimals: 2,
            icon: 'bi bi-1-circle',
            color: '#007bff'
          },
          {
            key: 'value2',
            label: 'Value 2',
            widget: 'number',
            decimals: 2,
            icon: 'bi bi-2-circle',
            color: '#28a745'
          },
          {
            key: 'status',
            label: 'Status',
            widget: 'status',
            icon: 'bi bi-info-circle',
            color: '#17a2b8'
          }
        ]
      },

      alarmConfig: [],

      commandList: [
        {
          key: 'restart',
          label: 'Restart',
          icon: 'bi bi-arrow-clockwise',
          color: 'primary',
          confirmationRequired: true
        }
      ],

      settingsSchema: [
        {
          key: 'device_name',
          label: 'Device Name',
          type: 'string',
          description: 'Custom name for the device',
          category: 'General'
        },
        {
          key: 'reporting_interval',
          label: 'Reporting Interval',
          type: 'select',
          unit: 'seconds',
          options: [
            { value: 30, label: '30 seconds' },
            { value: 60, label: '1 minute' },
            { value: 300, label: '5 minutes' },
            { value: 900, label: '15 minutes' }
          ],
          description: 'How often the device reports data',
          category: 'Communication'
        }
      ],

      deviceModel: {
        manufacturer: 'Generic',
        model: 'IOT-001',
        version: '1.0',
        capabilities: ['basic_monitoring']
      }
    });
  }
}

// Export singleton instance
export const deviceTemplateService = new DeviceTemplateService();
export default deviceTemplateService;