import type { SubtronicsDeviceTemplate, SubtronicsWidgetConfig } from '@/types/subtronics.types';

/**
 * Subtronics Device Template Service
 * 
 * Provides device templates and widget configurations for Subtronics Gas Monitor (OTSM-2)
 */
class SubtronicsTemplateService {
  private templates: Map<string, SubtronicsDeviceTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize device templates
   */
  private initializeTemplates(): void {
    // OTSM-2 Gas Monitor Template
    const otsm2Template: SubtronicsDeviceTemplate = {
      device_type: 'subtronics_gas_monitor',
      model_info: {
        manufacturer: 'Subtronics',
        model: 'OTSM-2',
        series: 'Gas Monitor',
        description: 'Subtronics Gas Detection Monitor with multi-level alarm system'
      },
      
      widget_mappings: {
        gas_concentration: {
          key: 'gas_concentration',
          label: 'Gas Concentration',
          widget: 'gauge',
          unit: 'ppm',
          min: 0,
          max: 2000, // Will be set from span_high
          decimals: 0,
          icon: 'bi bi-cloud',
          color: '#e74c3c',
          severityLevels: {
            safe: '<250',
            warning: '250-500',
            critical: '>500'
          }
        },
        
        alarm1_led: {
          key: 'alarm1_led',
          label: 'Alarm 1 LED',
          widget: 'led',
          icon: 'bi bi-lightbulb',
          color: '#ffc107'
        },
        
        alarm2_led: {
          key: 'alarm2_led',
          label: 'Alarm 2 LED',
          widget: 'led',
          icon: 'bi bi-lightbulb',
          color: '#fd7e14'
        },
        
        alarm3_led: {
          key: 'alarm3_led',
          label: 'Alarm 3 LED',
          widget: 'led',
          icon: 'bi bi-lightbulb',
          color: '#dc3545'
        },
        
        sensor_fault: {
          key: 'sensor_fault',
          label: 'Sensor Fault',
          widget: 'status',
          icon: 'bi bi-exclamation-triangle-fill',
          color: '#dc3545'
        }
      },
      
      alarm_thresholds: {
        a1_level: 250,
        a2_level: 500,
        a3_level: 1000
      },
      
      supported_commands: [
        'reset_alarms',
        'calibrate_sensor',
        'set_alarm_thresholds',
        'test_alarms',
        'restart_device'
      ]
    };

    this.templates.set('subtronics_gas_monitor', otsm2Template);
    this.templates.set('otsm-2', otsm2Template);
  }

  /**
   * Get device template by type
   */
  getTemplate(deviceType: string): SubtronicsDeviceTemplate | null {
    return this.templates.get(deviceType) || null;
  }

  /**
   * Get default template (OTSM-2)
   */
  getDefaultTemplate(): SubtronicsDeviceTemplate {
    return this.templates.get('subtronics_gas_monitor')!;
  }

  /**
   * Get widget configuration for a specific field
   */
  getWidgetConfig(deviceType: string, fieldKey: string): SubtronicsWidgetConfig | null {
    const template = this.getTemplate(deviceType);
    if (!template) return null;
    
    return template.widget_mappings[fieldKey as keyof typeof template.widget_mappings] || null;
  }

  /**
   * Get all widget configurations for a device type
   */
  getAllWidgetConfigs(deviceType: string): Record<string, SubtronicsWidgetConfig> {
    const template = this.getTemplate(deviceType);
    return template?.widget_mappings || {};
  }

  /**
   * Create widget configuration for gas concentration with dynamic thresholds
   */
  createGasConcentrationWidget(
    spanHigh: number,
    a1Level: number,
    a2Level: number,
    a3Level: number,
    unit: string = 'ppm'
  ): SubtronicsWidgetConfig {
    return {
      key: 'gas_concentration',
      label: 'Gas Concentration',
      widget: 'gauge',
      unit: unit,
      min: 0,
      max: spanHigh,
      decimals: 0,
      icon: 'bi bi-cloud',
      color: '#e74c3c',
      severityLevels: {
        safe: `<${a1Level}`,
        warning: `${a1Level}-${a2Level}`,
        critical: `>${a2Level}`
      }
    };
  }

  /**
   * Get alarm severity based on LED status
   */
  getAlarmSeverity(alarm1Led: number, alarm2Led: number, alarm3Led: number, sensorFault: number): {
    level: 'normal' | 'warning' | 'high' | 'critical';
    message: string;
    color: string;
  } {
    if (sensorFault === 1) {
      return {
        level: 'critical',
        message: 'Sensor Fault Detected',
        color: '#dc3545'
      };
    }
    
    if (alarm3Led === 1) {
      return {
        level: 'critical',
        message: 'Critical Gas Level (A3)',
        color: '#dc3545'
      };
    }
    
    if (alarm2Led === 1) {
      return {
        level: 'high',
        message: 'High Gas Level (A2)',
        color: '#fd7e14'
      };
    }
    
    if (alarm1Led === 1) {
      return {
        level: 'warning',
        message: 'Warning Gas Level (A1)',
        color: '#ffc107'
      };
    }
    
    return {
      level: 'normal',
      message: 'Normal Operation',
      color: '#28a745'
    };
  }

  /**
   * Get LED status color
   */
  getLedStatusColor(ledValue: number, alarmLevel: 'a1' | 'a2' | 'a3'): string {
    if (ledValue === 0) return '#6c757d'; // Gray for off
    
    switch (alarmLevel) {
      case 'a1': return '#ffc107'; // Yellow
      case 'a2': return '#fd7e14'; // Orange
      case 'a3': return '#dc3545'; // Red
      default: return '#6c757d';
    }
  }

  /**
   * Format gas type display name
   */
  formatGasType(gasType: string): string {
    const gasMap: Record<string, string> = {
      'Carbon Monoxide (CO)': 'Carbon Monoxide',
      'Hydrogen Sulfide (H2S)': 'Hydrogen Sulfide',
      'Methane (CH4)': 'Methane',
      'Oxygen (O2)': 'Oxygen',
      'Carbon Dioxide (CO2)': 'Carbon Dioxide',
      'Ammonia (NH3)': 'Ammonia',
      'Chlorine (Cl2)': 'Chlorine'
    };
    
    return gasMap[gasType] || gasType;
  }

  /**
   * Get gas type icon
   */
  getGasTypeIcon(gasType: string): string {
    const iconMap: Record<string, string> = {
      'Carbon Monoxide (CO)': 'bi bi-cloud-fog',
      'Hydrogen Sulfide (H2S)': 'bi bi-cloud-drizzle',
      'Methane (CH4)': 'bi bi-fire',
      'Oxygen (O2)': 'bi bi-wind',
      'Carbon Dioxide (CO2)': 'bi bi-cloud',
      'Ammonia (NH3)': 'bi bi-droplet',
      'Chlorine (Cl2)': 'bi bi-cloud-lightning'
    };
    
    return iconMap[gasType] || 'bi bi-cloud';
  }

  /**
   * Get gas type color
   */
  getGasTypeColor(gasType: string): string {
    const colorMap: Record<string, string> = {
      'Carbon Monoxide (CO)': '#e74c3c',
      'Hydrogen Sulfide (H2S)': '#9b59b6',
      'Methane (CH4)': '#f39c12',
      'Oxygen (O2)': '#3498db',
      'Carbon Dioxide (CO2)': '#95a5a6',
      'Ammonia (NH3)': '#1abc9c',
      'Chlorine (Cl2)': '#f1c40f'
    };
    
    return colorMap[gasType] || '#6c757d';
  }

  /**
   * Validate device template
   */
  validateTemplate(template: SubtronicsDeviceTemplate): boolean {
    if (!template.device_type || !template.model_info) {
      return false;
    }
    
    if (!template.widget_mappings || Object.keys(template.widget_mappings).length === 0) {
      return false;
    }
    
    if (!template.alarm_thresholds) {
      return false;
    }
    
    // Validate alarm threshold order
    const { a1_level, a2_level, a3_level } = template.alarm_thresholds;
    if (a1_level >= a2_level || a2_level >= a3_level) {
      return false;
    }
    
    return true;
  }

  /**
   * Get available device types
   */
  getAvailableDeviceTypes(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Register a new template
   */
  registerTemplate(deviceType: string, template: SubtronicsDeviceTemplate): void {
    if (this.validateTemplate(template)) {
      this.templates.set(deviceType, template);
    } else {
      throw new Error(`Invalid template for device type: ${deviceType}`);
    }
  }

  /**
   * Get template metadata
   */
  getTemplateMetadata(deviceType: string): {
    manufacturer: string;
    model: string;
    series: string;
    description: string;
  } | null {
    const template = this.getTemplate(deviceType);
    return template?.model_info || null;
  }

  /**
   * Create widget layout configuration
   */
  createWidgetLayout(deviceType: string): {
    primary: string[];
    alarms: string[];
    system: string[];
  } {
    const template = this.getTemplate(deviceType);
    if (!template) {
      return { primary: [], alarms: [], system: [] };
    }
    
    return {
      primary: ['gas_concentration'],
      alarms: ['alarm1_led', 'alarm2_led', 'alarm3_led'],
      system: ['sensor_fault']
    };
  }
}

// Export singleton instance
export const subtronicsTemplateService = new SubtronicsTemplateService();
export default subtronicsTemplateService;