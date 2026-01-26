import type { 
  SubtronicDeviceTemplate, 
  SubtronicDeviceType,
  SubtronicCommandType 
} from '@/types/subtronic.types';
import type { DeviceTemplate } from '@/types/deviceTemplate.types';

/**
 * Subtronic Device Template Service
 * 
 * Manages device templates specifically for Subtronic devices
 * Converts Subtronic API data to UI-compatible templates
 */
class SubtronicTemplateService {
  private templates: Map<SubtronicDeviceType, SubtronicDeviceTemplate> = new Map();

  constructor() {
    this.initializeSubtronicTemplates();
  }

  /**
   * Get Subtronic template for device type
   */
  getSubtronicTemplate(deviceType: SubtronicDeviceType): SubtronicDeviceTemplate | null {
    return this.templates.get(deviceType) || null;
  }

  /**
   * Convert Subtronic template to UI template
   */
  convertToUITemplate(subtronicTemplate: SubtronicDeviceTemplate): DeviceTemplate {
    const widgets = Object.entries(subtronicTemplate.data_mapping).map(([key, mapping]) => ({
      key,
      label: this.formatLabel(key),
      widget: mapping.widget_type,
      unit: mapping.unit,
      min: mapping.min,
      max: mapping.max,
      decimals: this.getDecimals(mapping.unit),
      severityLevels: mapping.severity_levels,
      icon: this.getIconForField(key),
      color: this.getColorForField(key)
    }));

    const commands = subtronicTemplate.supported_commands.map(cmd => ({
      key: cmd,
      label: this.formatCommandLabel(cmd),
      icon: this.getCommandIcon(cmd),
      color: this.getCommandColor(cmd),
      confirmationRequired: this.requiresConfirmation(cmd),
      description: this.getCommandDescription(cmd)
    }));

    const settings = Object.entries(subtronicTemplate.configuration_schema).map(([key, schema]) => ({
      key,
      label: schema.label,
      type: schema.type,
      unit: schema.unit,
      min: schema.min,
      max: schema.max,
      options: schema.options,
      description: schema.description,
      category: schema.category
    }));

    return {
      deviceType: 'generic', // Map to generic for UI compatibility
      displayName: `${subtronicTemplate.model_info.manufacturer} ${subtronicTemplate.model_info.model}`,
      description: `${subtronicTemplate.model_info.series} series cathodic protection system`,
      icon: this.getDeviceIcon(subtronicTemplate.device_type),
      color: this.getDeviceColor(subtronicTemplate.device_type),
      
      telemetrySchema: widgets,
      
      widgetConfig: {
        layout: 'grid',
        columns: this.getOptimalColumns(widgets.length),
        widgets
      },
      
      alarmConfig: [], // Will be populated from device data
      commandList: commands,
      settingsSchema: settings,
      
      deviceModel: {
        manufacturer: subtronicTemplate.model_info.manufacturer,
        model: subtronicTemplate.model_info.model,
        version: subtronicTemplate.model_info.series,
        capabilities: subtronicTemplate.model_info.capabilities
      },
      
      mqttConfig: {
        topicPrefix: 'subtronic',
        dataFormat: 'json',
        qos: 1
      }
    };
  }

  /**
   * Initialize Subtronic device templates
   */
  private initializeSubtronicTemplates(): void {
    // Cathodic Protection System Template
    this.templates.set('cathodic_protection', {
      device_type: 'cathodic_protection',
      model_info: {
        manufacturer: 'Subtronic',
        model: 'CP-3000',
        series: 'Professional',
        capabilities: [
          'cathodic_protection_monitoring',
          'potential_measurement',
          'current_measurement',
          'interrupt_measurement',
          'data_logging',
          'alarm_management',
          'remote_configuration'
        ]
      },
      
      endpoints: {
        data: '/subtronic/devices/{id}/data',
        commands: '/subtronic/devices/{id}/commands',
        status: '/subtronic/devices/{id}/status',
        history: '/subtronic/devices/{id}/history'
      },
      
      data_mapping: {
        potential_on: {
          source_field: 'measurements.potential_on',
          widget_type: 'gauge',
          unit: 'mV',
          min: -2000,
          max: 0,
          severity_levels: {
            safe: '-1200 to -850',
            warning: '-850 to -800, -1500 to -1200',
            critical: '>-800, <-1500'
          }
        },
        potential_off: {
          source_field: 'measurements.potential_off',
          widget_type: 'gauge',
          unit: 'mV',
          min: -2000,
          max: 0,
          severity_levels: {
            safe: '-1200 to -850',
            warning: '-850 to -800, -1500 to -1200',
            critical: '>-800, <-1500'
          }
        },
        current_protection: {
          source_field: 'measurements.current_protection',
          widget_type: 'number',
          unit: 'mA',
          min: 0,
          max: 1000
        },
        resistance_structure: {
          source_field: 'measurements.resistance_structure',
          widget_type: 'number',
          unit: 'Ω',
          min: 0,
          max: 10000
        },
        temperature: {
          source_field: 'measurements.temperature',
          widget_type: 'number',
          unit: '°C',
          min: -40,
          max: 80
        },
        battery_voltage: {
          source_field: 'measurements.battery_voltage',
          widget_type: 'gauge',
          unit: 'V',
          min: 10,
          max: 15,
          severity_levels: {
            safe: '12-14',
            warning: '11-12, 14-14.5',
            critical: '<11, >14.5'
          }
        },
        signal_strength: {
          source_field: 'measurements.signal_strength',
          widget_type: 'gauge',
          unit: 'dBm',
          min: -120,
          max: -50,
          severity_levels: {
            safe: '>-80',
            warning: '-80 to -90',
            critical: '<-90'
          }
        },
        operational_state: {
          source_field: 'status.operational_state',
          widget_type: 'status'
        }
      },
      
      supported_commands: [
        'restart_device',
        'start_measurement',
        'stop_measurement',
        'take_instant_reading',
        'set_measurement_mode',
        'set_interrupt_parameters',
        'set_alarm_thresholds',
        'set_electrode_type',
        'calibrate_potential',
        'calibrate_current',
        'acknowledge_alarm',
        'reset_alarms',
        'run_diagnostics',
        'export_data',
        'set_logging_interval'
      ],
      
      configuration_schema: {
        electrode_type: {
          type: 'select',
          label: 'Reference Electrode Type',
          description: 'Type of reference electrode used for measurements',
          options: [
            { value: 'cu_cuso4', label: 'Cu/CuSO4 (+316 mV)' },
            { value: 'ag_agcl', label: 'Ag/AgCl (+197 mV)' },
            { value: 'zinc', label: 'Zinc (-763 mV)' },
            { value: 'custom', label: 'Custom Offset' }
          ],
          category: 'Measurement'
        },
        measurement_mode: {
          type: 'select',
          label: 'Measurement Mode',
          description: 'Operating mode for potential measurements',
          options: [
            { value: 'normal', label: 'Normal (Continuous)' },
            { value: 'interrupt', label: 'Interrupt (Scheduled)' },
            { value: 'instant', label: 'Instant (On-demand)' },
            { value: 'survey', label: 'Survey (Manual)' }
          ],
          category: 'Measurement'
        },
        logging_interval: {
          type: 'select',
          label: 'Data Logging Interval',
          description: 'How often measurements are logged',
          unit: 'minutes',
          options: [
            { value: 1, label: '1 minute' },
            { value: 5, label: '5 minutes' },
            { value: 15, label: '15 minutes' },
            { value: 30, label: '30 minutes' },
            { value: 60, label: '1 hour' }
          ],
          category: 'Data Logging'
        },
        interrupt_on_time: {
          type: 'number',
          label: 'Interrupt ON Time',
          description: 'Duration of rectifier ON period during interrupt measurement',
          unit: 'seconds',
          min: 1,
          max: 300,
          category: 'Interrupt Settings'
        },
        interrupt_off_time: {
          type: 'number',
          label: 'Interrupt OFF Time',
          description: 'Duration of rectifier OFF period during interrupt measurement',
          unit: 'seconds',
          min: 1,
          max: 300,
          category: 'Interrupt Settings'
        },
        potential_high_alarm: {
          type: 'number',
          label: 'High Potential Alarm',
          description: 'Potential threshold for high alarm (less negative)',
          unit: 'mV',
          min: -1000,
          max: 0,
          category: 'Alarm Thresholds'
        },
        potential_low_alarm: {
          type: 'number',
          label: 'Low Potential Alarm',
          description: 'Potential threshold for low alarm (more negative)',
          unit: 'mV',
          min: -2000,
          max: -1000,
          category: 'Alarm Thresholds'
        },
        current_high_alarm: {
          type: 'number',
          label: 'High Current Alarm',
          description: 'Current threshold for high alarm',
          unit: 'mA',
          min: 0,
          max: 1000,
          category: 'Alarm Thresholds'
        }
      }
    });

    // CP Rectifier Template
    this.templates.set('cp_rectifier', {
      device_type: 'cp_rectifier',
      model_info: {
        manufacturer: 'Subtronic',
        model: 'CPR-5000',
        series: 'Industrial',
        capabilities: [
          'rectifier_control',
          'current_regulation',
          'voltage_regulation',
          'power_monitoring',
          'fault_detection',
          'remote_control'
        ]
      },
      
      endpoints: {
        data: '/subtronic/devices/{id}/data',
        commands: '/subtronic/devices/{id}/commands',
        status: '/subtronic/devices/{id}/status',
        history: '/subtronic/devices/{id}/history'
      },
      
      data_mapping: {
        output_voltage: {
          source_field: 'measurements.output_voltage',
          widget_type: 'gauge',
          unit: 'V',
          min: 0,
          max: 50,
          severity_levels: {
            safe: '5-45',
            warning: '45-48, 2-5',
            critical: '>48, <2'
          }
        },
        output_current: {
          source_field: 'measurements.output_current',
          widget_type: 'gauge',
          unit: 'A',
          min: 0,
          max: 100,
          severity_levels: {
            safe: '<80',
            warning: '80-90',
            critical: '>90'
          }
        },
        power_consumption: {
          source_field: 'measurements.power_consumption',
          widget_type: 'number',
          unit: 'W',
          min: 0,
          max: 5000
        },
        efficiency: {
          source_field: 'measurements.efficiency',
          widget_type: 'gauge',
          unit: '%',
          min: 0,
          max: 100,
          severity_levels: {
            safe: '>85',
            warning: '75-85',
            critical: '<75'
          }
        },
        temperature: {
          source_field: 'measurements.temperature',
          widget_type: 'number',
          unit: '°C',
          min: -20,
          max: 100
        },
        operational_state: {
          source_field: 'status.operational_state',
          widget_type: 'status'
        }
      },
      
      supported_commands: [
        'restart_device',
        'start_measurement',
        'stop_measurement',
        'set_output_voltage',
        'set_output_current',
        'enable_output',
        'disable_output',
        'reset_alarms',
        'run_diagnostics',
        'export_data'
      ],
      
      configuration_schema: {
        output_voltage_setpoint: {
          type: 'number',
          label: 'Output Voltage Setpoint',
          description: 'Target output voltage',
          unit: 'V',
          min: 0,
          max: 50,
          category: 'Output Control'
        },
        output_current_limit: {
          type: 'number',
          label: 'Output Current Limit',
          description: 'Maximum output current',
          unit: 'A',
          min: 0,
          max: 100,
          category: 'Output Control'
        },
        regulation_mode: {
          type: 'select',
          label: 'Regulation Mode',
          description: 'Voltage or current regulation mode',
          options: [
            { value: 'voltage', label: 'Constant Voltage' },
            { value: 'current', label: 'Constant Current' },
            { value: 'power', label: 'Constant Power' }
          ],
          category: 'Control'
        }
      }
    });

    // Monitoring Station Template
    this.templates.set('monitoring_station', {
      device_type: 'monitoring_station',
      model_info: {
        manufacturer: 'Subtronic',
        model: 'MS-2000',
        series: 'Compact',
        capabilities: [
          'multi_point_monitoring',
          'data_logging',
          'wireless_communication',
          'solar_powered',
          'weather_monitoring'
        ]
      },
      
      endpoints: {
        data: '/subtronic/devices/{id}/data',
        commands: '/subtronic/devices/{id}/commands',
        status: '/subtronic/devices/{id}/status',
        history: '/subtronic/devices/{id}/history'
      },
      
      data_mapping: {
        potential_1: {
          source_field: 'measurements.potential_1',
          widget_type: 'gauge',
          unit: 'mV',
          min: -2000,
          max: 0
        },
        potential_2: {
          source_field: 'measurements.potential_2',
          widget_type: 'gauge',
          unit: 'mV',
          min: -2000,
          max: 0
        },
        potential_3: {
          source_field: 'measurements.potential_3',
          widget_type: 'gauge',
          unit: 'mV',
          min: -2000,
          max: 0
        },
        potential_4: {
          source_field: 'measurements.potential_4',
          widget_type: 'gauge',
          unit: 'mV',
          min: -2000,
          max: 0
        },
        temperature: {
          source_field: 'measurements.temperature',
          widget_type: 'number',
          unit: '°C',
          min: -40,
          max: 80
        },
        humidity: {
          source_field: 'measurements.humidity',
          widget_type: 'number',
          unit: '%',
          min: 0,
          max: 100
        },
        battery_voltage: {
          source_field: 'measurements.battery_voltage',
          widget_type: 'gauge',
          unit: 'V',
          min: 10,
          max: 15
        },
        solar_voltage: {
          source_field: 'measurements.solar_voltage',
          widget_type: 'number',
          unit: 'V',
          min: 0,
          max: 25
        }
      },
      
      supported_commands: [
        'restart_device',
        'take_instant_reading',
        'set_logging_interval',
        'calibrate_potential',
        'reset_alarms',
        'export_data',
        'sync_time'
      ],
      
      configuration_schema: {
        logging_interval: {
          type: 'select',
          label: 'Logging Interval',
          unit: 'minutes',
          options: [
            { value: 5, label: '5 minutes' },
            { value: 15, label: '15 minutes' },
            { value: 30, label: '30 minutes' },
            { value: 60, label: '1 hour' }
          ],
          category: 'Data Logging'
        },
        electrode_type: {
          type: 'select',
          label: 'Reference Electrode',
          options: [
            { value: 'cu_cuso4', label: 'Cu/CuSO4' },
            { value: 'ag_agcl', label: 'Ag/AgCl' },
            { value: 'zinc', label: 'Zinc' }
          ],
          category: 'Measurement'
        }
      }
    });
  }

  /**
   * Helper methods for template conversion
   */
  private formatLabel(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatCommandLabel(command: SubtronicCommandType): string {
    return command
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getDecimals(unit?: string): number {
    if (!unit) return 0;
    if (unit === 'mV' || unit === '°C') return 1;
    if (unit === 'V' || unit === 'A') return 2;
    return 0;
  }

  private getIconForField(key: string): string {
    if (key.includes('potential')) return 'bi bi-lightning';
    if (key.includes('current')) return 'bi bi-activity';
    if (key.includes('resistance')) return 'bi bi-diagram-3';
    if (key.includes('temperature')) return 'bi bi-thermometer';
    if (key.includes('humidity')) return 'bi bi-droplet';
    if (key.includes('battery')) return 'bi bi-battery';
    if (key.includes('solar')) return 'bi bi-sun';
    if (key.includes('signal')) return 'bi bi-wifi';
    return 'bi bi-graph-up';
  }

  private getColorForField(key: string): string {
    if (key.includes('potential')) return '#f39c12';
    if (key.includes('current')) return '#e74c3c';
    if (key.includes('resistance')) return '#9b59b6';
    if (key.includes('temperature')) return '#ff6b6b';
    if (key.includes('humidity')) return '#3498db';
    if (key.includes('battery')) return '#27ae60';
    if (key.includes('solar')) return '#f1c40f';
    if (key.includes('signal')) return '#17a2b8';
    return '#6c757d';
  }

  private getCommandIcon(command: SubtronicCommandType): string {
    const iconMap: Record<string, string> = {
      restart_device: 'bi bi-arrow-clockwise',
      start_measurement: 'bi bi-play-circle',
      stop_measurement: 'bi bi-stop-circle',
      take_instant_reading: 'bi bi-speedometer2',
      calibrate_potential: 'bi bi-bullseye',
      calibrate_current: 'bi bi-rulers',
      set_measurement_mode: 'bi bi-gear',
      reset_alarms: 'bi bi-bell-slash',
      run_diagnostics: 'bi bi-tools',
      export_data: 'bi bi-download'
    };
    return iconMap[command] || 'bi bi-gear';
  }

  private getCommandColor(command: SubtronicCommandType): string {
    if (command.includes('restart') || command.includes('reset')) return 'danger';
    if (command.includes('calibrate') || command.includes('diagnostics')) return 'warning';
    if (command.includes('start') || command.includes('take')) return 'success';
    if (command.includes('stop')) return 'secondary';
    return 'primary';
  }

  private requiresConfirmation(command: SubtronicCommandType): boolean {
    return [
      'restart_device',
      'factory_reset',
      'firmware_update',
      'calibrate_potential',
      'calibrate_current'
    ].includes(command);
  }

  private getCommandDescription(command: SubtronicCommandType): string {
    const descriptions: Record<string, string> = {
      restart_device: 'Restart the device (may cause temporary data loss)',
      start_measurement: 'Begin continuous measurements',
      stop_measurement: 'Stop all measurements',
      take_instant_reading: 'Take a single measurement reading',
      calibrate_potential: 'Calibrate potential measurement accuracy',
      calibrate_current: 'Calibrate current measurement accuracy',
      set_measurement_mode: 'Change the measurement operating mode',
      reset_alarms: 'Clear all active alarms',
      run_diagnostics: 'Perform comprehensive system diagnostics',
      export_data: 'Export historical data to file'
    };
    return descriptions[command] || 'Execute device command';
  }

  private getDeviceIcon(deviceType: SubtronicDeviceType): string {
    const iconMap: Record<SubtronicDeviceType, string> = {
      cathodic_protection: 'bi bi-shield-check',
      cp_rectifier: 'bi bi-lightning-charge',
      monitoring_station: 'bi bi-broadcast',
      reference_electrode: 'bi bi-bullseye'
    };
    return iconMap[deviceType];
  }

  private getDeviceColor(deviceType: SubtronicDeviceType): string {
    const colorMap: Record<SubtronicDeviceType, string> = {
      cathodic_protection: '#27ae60',
      cp_rectifier: '#e74c3c',
      monitoring_station: '#3498db',
      reference_electrode: '#f39c12'
    };
    return colorMap[deviceType];
  }

  private getOptimalColumns(widgetCount: number): number {
    if (widgetCount <= 2) return 2;
    if (widgetCount <= 4) return 2;
    if (widgetCount <= 6) return 3;
    return 4;
  }
}

// Export singleton instance
export const subtronicTemplateService = new SubtronicTemplateService();
export default subtronicTemplateService;