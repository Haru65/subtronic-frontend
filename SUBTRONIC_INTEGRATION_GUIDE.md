# Subtronic Device Integration Guide

## 🎯 Overview

This guide documents the complete integration of Subtronic cathodic protection devices with the ZEPTAC IoT platform. The integration provides real-time monitoring, command execution, and configuration management for Subtronic devices through their REST API endpoints.

## 🔌 API Endpoints

### Core Endpoints

#### Device Data
```
GET /subtronic/devices/{id}/data
```
Returns real-time device measurements, configuration, status, and location information.

#### Device Commands
```
POST /subtronic/devices/{id}/commands
```
Executes commands on the device with parameters, priority, and scheduling options.

#### Device Status
```
GET /subtronic/devices/{id}/status
```
Returns device operational status, communication quality, and system health.

#### Historical Data
```
GET /subtronic/devices/{id}/history?start_date={date}&end_date={date}&interval={interval}
```
Retrieves historical measurement data with optional time interval grouping.

#### Device Configuration
```
GET /subtronic/devices/{id}/config
PUT /subtronic/devices/{id}/config
```
Retrieves and updates device configuration settings.

#### Alarms & Events
```
GET /subtronic/devices/{id}/alarms
POST /subtronic/devices/{id}/alarms/{alarmId}/acknowledge
```
Manages device alarms and acknowledgments.

## 📊 Data Structure

### Device Data Response

```typescript
interface SubtronicDeviceData {
  deviceId: string;
  timestamp: string;
  quality: 'good' | 'uncertain' | 'bad' | 'offline';
  
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
    
    // Environmental & System
    temperature?: number;
    humidity?: number;
    battery_voltage?: number;
    solar_voltage?: number;
    signal_strength?: number;
    
    // Digital I/O
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
  
  configuration: {
    electrode_type: 'cu_cuso4' | 'ag_agcl' | 'zinc' | 'custom';
    measurement_mode: 'normal' | 'interrupt' | 'instant' | 'survey';
    logging_interval: number;
    interrupt_settings?: {
      on_time: number;
      off_time: number;
      cycles: number;
    };
    thresholds: {
      potential_high: number;
      potential_low: number;
      current_high: number;
      current_low: number;
    };
  };
  
  status: {
    operational_state: 'normal' | 'alarm' | 'fault' | 'maintenance' | 'offline';
    last_communication: string;
    uptime: number;
    firmware_version: string;
    hardware_revision: string;
  };
  
  location: {
    latitude?: number;
    longitude?: number;
    elevation?: number;
    site_name: string;
    installation_date: string;
    pipeline_details?: {
      diameter: number;
      material: string;
      coating_type: string;
      burial_depth: number;
    };
  };
}
```

### Command Request Structure

```typescript
interface SubtronicCommandRequest {
  command_id: string;
  command_type: SubtronicCommandType;
  parameters: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeout: number;
  retry_count?: number;
  scheduled_time?: string;
}
```

## 🎛️ Supported Commands

### System Commands
- `restart_device` - Restart the device
- `factory_reset` - Reset to factory defaults
- `firmware_update` - Update device firmware
- `sync_time` - Synchronize device time
- `reboot_modem` - Restart communication modem

### Measurement Commands
- `start_measurement` - Begin continuous measurements
- `stop_measurement` - Stop all measurements
- `take_instant_reading` - Take single measurement
- `calibrate_potential` - Calibrate potential measurement
- `calibrate_current` - Calibrate current measurement
- `zero_calibration` - Perform zero calibration

### Configuration Commands
- `set_measurement_mode` - Change measurement mode
- `set_logging_interval` - Set data logging interval
- `set_interrupt_parameters` - Configure interrupt measurement
- `set_alarm_thresholds` - Set alarm threshold values
- `set_electrode_type` - Configure reference electrode

### Alarm Commands
- `acknowledge_alarm` - Acknowledge active alarm
- `reset_alarms` - Clear all alarms
- `test_alarm` - Test alarm functionality
- `silence_alarm` - Temporarily silence alarms

### Data Commands
- `download_logs` - Download historical data
- `clear_logs` - Clear device memory
- `export_data` - Export data in specified format
- `backup_configuration` - Backup device settings
- `restore_configuration` - Restore device settings

### Diagnostic Commands
- `run_diagnostics` - Perform system diagnostics
- `test_communication` - Test communication link
- `check_system_health` - Check system status
- `measure_loop_resistance` - Test measurement loop

## 🏗️ Implementation Architecture

### Service Layer

#### SubtronicService
Main service class for API communication:

```typescript
class SubtronicService {
  // Core methods
  async getDeviceData(deviceId: string): Promise<SubtronicDeviceData>
  async executeCommand<T>(deviceId: string, commandType: T, parameters: any): Promise<SubtronicCommandResponse>
  async getDeviceStatus(deviceId: string): Promise<SubtronicDeviceStatus>
  async getDeviceHistory(deviceId: string, startDate: string, endDate: string): Promise<SubtronicHistoricalData[]>
  
  // Configuration methods
  async getDeviceConfig(deviceId: string): Promise<SubtronicDeviceConfig>
  async updateDeviceConfig(deviceId: string, config: Partial<SubtronicDeviceConfig>): Promise<SubtronicDeviceConfig>
  
  // Alarm methods
  async getDeviceAlarms(deviceId: string, options?: any): Promise<SubtronicAlarmEvent[]>
  async acknowledgeAlarm(deviceId: string, alarmId: string, acknowledgedBy: string): Promise<void>
  
  // Convenience methods
  async restartDevice(deviceId: string): Promise<SubtronicCommandResponse>
  async setMeasurementMode(deviceId: string, mode: string): Promise<SubtronicCommandResponse>
  async setAlarmThresholds(deviceId: string, thresholds: any): Promise<SubtronicCommandResponse>
  async takeInstantReading(deviceId: string): Promise<SubtronicCommandResponse>
  async calibratePotential(deviceId: string, referenceValue: number): Promise<SubtronicCommandResponse>
}
```

#### SubtronicTemplateService
Manages device templates and UI mapping:

```typescript
class SubtronicTemplateService {
  getSubtronicTemplate(deviceType: SubtronicDeviceType): SubtronicDeviceTemplate | null
  convertToUITemplate(subtronicTemplate: SubtronicDeviceTemplate): DeviceTemplate
}
```

### UI Components

#### SubtronicDeviceDetails.vue
Main component for displaying Subtronic device information:

- **Header Section**: Device info, status, and actions
- **Measurements Grid**: Real-time telemetry widgets
- **System Information**: Firmware, uptime, environmental data
- **Commands Section**: Available device commands
- **Configuration Panel**: Device settings with pending changes
- **Command Status**: Active command monitoring
- **Alarms & Events**: Alarm management and acknowledgment

### Widget Integration

The Subtronic integration uses the existing widget system:

- **GaugeWidget**: For potential, current, battery voltage, signal strength
- **NumberWidget**: For resistance, temperature, power measurements
- **StatusWidget**: For operational state and system status

### Data Mapping

Device measurements are mapped to UI widgets through the template system:

```typescript
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
  }
}
```

## 🔧 Configuration Management

### Device Configuration Schema

```typescript
configuration_schema: {
  electrode_type: {
    type: 'select',
    label: 'Reference Electrode Type',
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
    options: [
      { value: 'normal', label: 'Normal (Continuous)' },
      { value: 'interrupt', label: 'Interrupt (Scheduled)' },
      { value: 'instant', label: 'Instant (On-demand)' },
      { value: 'survey', label: 'Survey (Manual)' }
    ],
    category: 'Measurement'
  }
}
```

### Pending Changes System

Configuration changes are staged locally before applying:

1. User modifies settings in UI
2. Changes stored in `pendingConfig` reactive object
3. UI shows pending changes count
4. User clicks "Apply Changes" to send to device
5. Configuration updated via PUT request
6. Device data refreshed to reflect changes

## 🚨 Alarm Management

### Alarm Types

- **potential_high**: Potential above safe threshold (less negative)
- **potential_low**: Potential below safe threshold (more negative)
- **current_high**: Protection current above normal range
- **current_low**: Protection current below minimum
- **system_fault**: Hardware or software fault
- **communication**: Communication link issues

### Alarm Workflow

1. Device detects alarm condition
2. Alarm appears in device data and alarms endpoint
3. UI displays alarm with severity color coding
4. User can acknowledge alarm
5. Alarm marked as acknowledged in system
6. Auto-clearing alarms clear when condition resolves

## 📈 Real-time Updates

### Polling Strategy

The UI implements intelligent polling:

- **Normal Operation**: 30-second intervals
- **Command Execution**: 10-second intervals for command status
- **Alarm Conditions**: 15-second intervals
- **Manual Refresh**: Immediate update on user request

### Data Quality Indicators

- **Good**: Fresh, reliable data
- **Uncertain**: Data may be stale or estimated
- **Bad**: Data quality compromised
- **Offline**: No communication with device

## 🔒 Security & Authentication

### API Authentication

- Bearer token authentication
- Token stored in localStorage
- Automatic token refresh
- Unauthorized access handling

### Request Tracking

- Unique request IDs for all API calls
- Request/response logging
- Error tracking and reporting

## 🧪 Testing & Validation

### API Testing

```javascript
// Example API test
describe('SubtronicService', () => {
  it('should get device data', async () => {
    const data = await subtronicService.getDeviceData('CP001');
    expect(data.deviceId).toBe('CP001');
    expect(data.measurements).toBeDefined();
    expect(data.status.operational_state).toMatch(/normal|alarm|fault|maintenance|offline/);
  });
  
  it('should execute commands', async () => {
    const response = await subtronicService.executeCommand('CP001', 'take_instant_reading', {});
    expect(response.command_id).toBeDefined();
    expect(response.status).toBe('pending');
  });
});
```

### UI Testing

```javascript
// Example component test
describe('SubtronicDeviceDetails', () => {
  it('should display device measurements', async () => {
    const wrapper = mount(SubtronicDeviceDetails, {
      props: { deviceId: 'CP001' }
    });
    
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('.device-name').text()).toContain('CP001');
    expect(wrapper.find('.measurements-grid').exists()).toBe(true);
  });
});
```

## 🚀 Deployment & Configuration

### Environment Variables

```env
VITE_SUBTRONIC_API_URL=https://api.subtronic.com
VITE_SUBTRONIC_API_TOKEN=your_api_token_here
VITE_SUBTRONIC_POLLING_INTERVAL=30000
VITE_SUBTRONIC_COMMAND_TIMEOUT=60000
```

### API Configuration

```typescript
// API service configuration
const subtronicConfig = {
  baseURL: process.env.VITE_SUBTRONIC_API_URL,
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
};
```

## 📋 Usage Examples

### Basic Device Monitoring

```typescript
// Load device data
const deviceData = await subtronicService.getDeviceData('CP001');
console.log('Potential ON:', deviceData.measurements.potential_on, 'mV');
console.log('Status:', deviceData.status.operational_state);
```

### Execute Commands

```typescript
// Restart device
const response = await subtronicService.restartDevice('CP001');
console.log('Command ID:', response.command_id);

// Set measurement mode
await subtronicService.setMeasurementMode('CP001', 'interrupt');

// Calibrate potential
await subtronicService.calibratePotential('CP001', -850);
```

### Configuration Management

```typescript
// Get current configuration
const config = await subtronicService.getDeviceConfig('CP001');

// Update alarm thresholds
await subtronicService.updateDeviceConfig('CP001', {
  alarm_configuration: {
    thresholds: {
      potential_high: -800,
      potential_low: -1500,
      current_high: 100,
      current_low: 5
    }
  }
});
```

### Alarm Management

```typescript
// Get active alarms
const alarms = await subtronicService.getDeviceAlarms('CP001', {
  active_only: true
});

// Acknowledge alarm
await subtronicService.acknowledgeAlarm('CP001', 'alarm_123', 'John Doe');
```

## 🔄 Migration from Legacy System

### Data Mapping

Legacy ZEPTAC data structures are mapped to Subtronic format:

```typescript
// Legacy format
const legacyData = {
  potential: -950,
  current: 25,
  temperature: 23
};

// Subtronic format
const subtronicData = {
  measurements: {
    potential_on: -950,
    current_protection: 25,
    temperature: 23
  }
};
```

### Command Translation

Legacy commands are translated to Subtronic equivalents:

```typescript
const commandMapping = {
  'restart': 'restart_device',
  'calibrate': 'calibrate_potential',
  'set_mode': 'set_measurement_mode',
  'read_instant': 'take_instant_reading'
};
```

## 📞 Support & Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Check network connectivity
   - Verify API endpoint URL
   - Validate authentication token

2. **Command Execution Failures**
   - Check device online status
   - Verify command parameters
   - Review device capabilities

3. **Data Quality Issues**
   - Check device communication
   - Verify measurement configuration
   - Review alarm conditions

### Debug Mode

Enable debug logging:

```typescript
localStorage.setItem('subtronic_debug', 'true');
```

### API Rate Limits

- Maximum 100 requests per minute per device
- Command execution limited to 10 concurrent commands
- Historical data requests limited to 24-hour periods

## 🔮 Future Enhancements

### Planned Features

1. **Batch Operations**: Multi-device command execution
2. **Advanced Analytics**: Trend analysis and predictive maintenance
3. **Custom Dashboards**: User-configurable device groupings
4. **Mobile Optimization**: Enhanced mobile device support
5. **Offline Capabilities**: Local data caching and sync
6. **Integration APIs**: Third-party system integration
7. **Advanced Reporting**: Automated report generation
8. **Machine Learning**: Anomaly detection and prediction

### API Roadmap

- GraphQL endpoint for flexible data queries
- WebSocket support for real-time streaming
- Bulk data export capabilities
- Advanced filtering and search
- Custom alert rules engine

---

**Built for Enterprise Cathodic Protection Monitoring**

*Subtronic Integration - Connecting industrial-grade corrosion protection systems with modern IoT management platforms.*