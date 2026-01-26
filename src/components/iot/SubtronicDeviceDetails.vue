<template>
  <div class="subtronic-device-details">
    <!-- Header Section -->
    <div class="device-header">
      <div class="container-fluid">
        <div class="row align-items-center">
          <!-- Back Button -->
          <div class="col-auto">
            <router-link to="/devices" class="btn btn-light btn-sm">
              <i class="bi bi-arrow-left me-2"></i>
              Back to Devices
            </router-link>
          </div>

          <!-- Device Info -->
          <div class="col">
            <div class="d-flex align-items-center gap-3">
              <!-- Subtronic Logo/Icon -->
              <div class="device-icon subtronic-brand">
                <i class="bi bi-shield-check"></i>
                <div class="brand-badge">Subtronic</div>
              </div>

              <!-- Device Details -->
              <div>
                <h1 class="device-name mb-1">{{ deviceData?.location.site_name || 'Subtronic Device' }}</h1>
                <div class="device-meta">
                  <span class="model-info">
                    <i class="bi bi-cpu me-1"></i>
                    {{ deviceTemplate?.model_info.model }} {{ deviceTemplate?.model_info.series }}
                  </span>
                  <span class="device-id ms-3">
                    <i class="bi bi-tag me-1"></i>
                    {{ deviceId }}
                  </span>
                </div>
                <div class="location-info mt-1">
                  <small class="text-muted">
                    <i class="bi bi-geo-alt me-1"></i>
                    {{ formatLocation() }}
                  </small>
                </div>
              </div>
            </div>
          </div>

          <!-- Status & Actions -->
          <div class="col-auto">
            <div class="d-flex align-items-center gap-3">
              <!-- Device Status -->
              <div class="device-status">
                <span class="status-badge" :class="getStatusClass()">
                  <i class="bi bi-circle-fill me-1"></i>
                  {{ deviceData?.status.operational_state || 'Unknown' }}
                </span>
                <div class="last-communication mt-1">
                  <small class="text-muted">
                    Last comm: {{ formatTime(deviceData?.status.last_communication) }}
                  </small>
                </div>
              </div>

              <!-- Refresh Button -->
              <button 
                @click="refreshDevice"
                :disabled="refreshing"
                class="btn btn-primary btn-sm"
              >
                <i :class="refreshing ? 'bi bi-hourglass-split' : 'bi bi-arrow-clockwise'" class="me-2"></i>
                {{ refreshing ? 'Refreshing...' : 'Refresh' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading Subtronic device...</span>
        </div>
        <p class="mt-3 text-muted">Connecting to Subtronic API...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Subtronic API Error:</strong> {{ error }}
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="deviceData && deviceTemplate" class="device-content">
      <div class="container-fluid">
        <div class="row g-4">
          <!-- Left Column: Real-time Measurements -->
          <div class="col-lg-8">
            <!-- Measurement Widgets -->
            <div class="measurements-section">
              <div class="section-header">
                <h3 class="section-title">
                  <i class="bi bi-activity me-2"></i>
                  Real-time Measurements
                </h3>
                <div class="section-actions">
                  <span class="data-quality" :class="getDataQualityClass()">
                    <i class="bi bi-circle-fill me-1"></i>
                    {{ deviceData.quality }}
                  </span>
                  <span class="measurement-time ms-3">
                    <i class="bi bi-clock me-1"></i>
                    {{ formatTime(deviceData.timestamp) }}
                  </span>
                </div>
              </div>

              <!-- Dynamic Measurement Grid -->
              <div class="measurements-grid">
                <component
                  v-for="(mapping, key) in deviceTemplate.data_mapping"
                  :key="key"
                  :is="getWidgetComponent(mapping.widget_type)"
                  :widget="createWidgetConfig(key, mapping)"
                  :value="getMeasurementValue(key, mapping.source_field)"
                  :previous-value="getPreviousMeasurementValue(key)"
                  :last-update="deviceData.timestamp"
                  :loading="refreshing"
                  @action="handleWidgetAction"
                />
              </div>
            </div>

            <!-- System Information -->
            <div class="system-info-section mt-4">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-info-circle me-2"></i>
                  System Information
                </h4>
              </div>
              
              <div class="system-info-grid">
                <div class="info-card">
                  <div class="info-icon">
                    <i class="bi bi-cpu"></i>
                  </div>
                  <div class="info-content">
                    <div class="info-label">Firmware Version</div>
                    <div class="info-value">{{ deviceData.status.firmware_version }}</div>
                  </div>
                </div>
                
                <div class="info-card">
                  <div class="info-icon">
                    <i class="bi bi-clock-history"></i>
                  </div>
                  <div class="info-content">
                    <div class="info-label">Uptime</div>
                    <div class="info-value">{{ formatUptimeDisplay(deviceData.status.uptime) }}</div>
                  </div>
                </div>
                
                <div class="info-card">
                  <div class="info-icon">
                    <i class="bi bi-thermometer"></i>
                  </div>
                  <div class="info-content">
                    <div class="info-label">Temperature</div>
                    <div class="info-value">{{ deviceData.measurements.temperature }}°C</div>
                  </div>
                </div>
                
                <div class="info-card" v-if="deviceData.measurements.signal_strength">
                  <div class="info-icon">
                    <i class="bi bi-wifi"></i>
                  </div>
                  <div class="info-content">
                    <div class="info-label">Signal Strength</div>
                    <div class="info-value">{{ deviceData.measurements.signal_strength }} dBm</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Controls & Configuration -->
          <div class="col-lg-4">
            <!-- Subtronic Commands -->
            <div class="commands-section">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-terminal me-2"></i>
                  Device Commands
                </h4>
              </div>

              <div class="commands-grid">
                <button
                  v-for="command in deviceTemplate.supported_commands"
                  :key="command"
                  class="command-button"
                  :class="getCommandButtonClass(command)"
                  @click="executeSubtronicCommand(command)"
                  :disabled="commandExecuting"
                >
                  <div class="command-icon">
                    <i :class="getCommandIcon(command)"></i>
                  </div>
                  <div class="command-label">{{ formatCommandLabel(command) }}</div>
                </button>
              </div>
            </div>

            <!-- Device Configuration -->
            <div class="configuration-section mt-4">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-sliders me-2"></i>
                  Configuration
                </h4>
                <button 
                  v-if="hasPendingConfig"
                  @click="applyConfiguration"
                  class="btn btn-success btn-sm"
                  :disabled="applyingConfig"
                >
                  <i class="bi bi-check2 me-1"></i>
                  Apply Changes ({{ pendingConfigCount }})
                </button>
              </div>

              <div class="configuration-list">
                <div 
                  v-for="(schema, key) in deviceTemplate.configuration_schema"
                  :key="key"
                  class="config-item"
                >
                  <div class="config-info">
                    <div class="config-label">{{ schema.label }}</div>
                    <div class="config-description" v-if="schema.description">
                      {{ schema.description }}
                    </div>
                    <div class="config-category">
                      <small class="text-muted">{{ schema.category }}</small>
                    </div>
                  </div>
                  <div class="config-control">
                    <SettingControl
                      :setting="convertToSettingConfig(key, schema)"
                      :value="getConfigValue(key)"
                      @update="updateConfiguration"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Command Status -->
            <div class="command-status-section mt-4" v-if="activeCommands.length > 0">
              <div class="section-header">
                <h5 class="section-title">
                  <i class="bi bi-list-task me-2"></i>
                  Active Commands
                </h5>
              </div>

              <div class="command-status-list">
                <div 
                  v-for="command in activeCommands"
                  :key="command.command_id"
                  class="command-status-item"
                  :class="`status-${command.status}`"
                >
                  <div class="command-info">
                    <div class="command-name">{{ formatCommandLabel(command.command_type) }}</div>
                    <div class="command-time">
                      <small class="text-muted">{{ formatTime(command.submitted_at) }}</small>
                    </div>
                  </div>
                  <div class="command-progress">
                    <div class="status-badge" :class="`badge-${command.status}`">
                      {{ command.status }}
                    </div>
                    <div v-if="command.progress !== undefined" class="progress mt-1" style="height: 4px;">
                      <div 
                        class="progress-bar" 
                        :style="{ width: `${command.progress}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Alarms & Events -->
        <div class="row mt-4">
          <div class="col-12">
            <div class="alarms-section">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  Alarms & Events
                </h4>
                <div class="section-actions">
                  <button class="btn btn-outline-primary btn-sm" @click="refreshAlarms">
                    <i class="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                  </button>
                </div>
              </div>

              <div class="alarms-list">
                <div 
                  v-for="alarm in alarms"
                  :key="alarm.alarm_id"
                  class="alarm-item"
                  :class="`alarm-${alarm.severity}`"
                >
                  <div class="alarm-icon">
                    <i :class="getAlarmIcon(alarm.alarm_type)"></i>
                  </div>
                  <div class="alarm-content">
                    <div class="alarm-message">{{ alarm.message }}</div>
                    <div class="alarm-meta">
                      <span class="alarm-time">{{ formatTime(alarm.triggered_at) }}</span>
                      <span class="alarm-type ms-2">{{ formatAlarmType(alarm.alarm_type) }}</span>
                      <span v-if="alarm.value" class="alarm-value ms-2">
                        Value: {{ alarm.value }}{{ getAlarmUnit(alarm.alarm_type) }}
                      </span>
                    </div>
                  </div>
                  <div class="alarm-actions" v-if="!alarm.acknowledged_at">
                    <button 
                      class="btn btn-sm btn-outline-success"
                      @click="acknowledgeAlarm(alarm.alarm_id)"
                    >
                      <i class="bi bi-check2 me-1"></i>
                      Acknowledge
                    </button>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-if="alarms.length === 0" class="empty-alarms">
                  <i class="bi bi-check-circle text-success display-4"></i>
                  <p class="mt-2 text-muted">No active alarms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import GaugeWidget from './widgets/GaugeWidget.vue';
import NumberWidget from './widgets/NumberWidget.vue';
import StatusWidget from './widgets/StatusWidget.vue';
import SettingControl from './settings/SettingControl.vue';
import { subtronicService } from '@/services/subtronic.service';
import { subtronicTemplateService } from '@/services/subtronicTemplate.service';
import { formatTime, formatUptime } from '@/utils/dateFormatter';
import type { 
  SubtronicDeviceData,
  SubtronicDeviceTemplate,
  SubtronicCommandResponse,
  SubtronicAlarmEvent,
  SubtronicCommandType
} from '@/types/subtronic.types';

// Props
interface Props {
  deviceId?: string;
}

const props = defineProps<Props>();
const route = useRoute();

// Reactive state
const deviceData = ref<SubtronicDeviceData | null>(null);
const deviceTemplate = ref<SubtronicDeviceTemplate | null>(null);
const alarms = ref<SubtronicAlarmEvent[]>([]);
const activeCommands = ref<SubtronicCommandResponse[]>([]);
const loading = ref(true);
const refreshing = ref(false);
const error = ref<string | null>(null);
const commandExecuting = ref(false);
const applyingConfig = ref(false);
const pendingConfig = ref<Record<string, any>>({});
const previousMeasurements = ref<Record<string, any>>({});

// Computed properties
const deviceIdFromRoute = computed(() => props.deviceId || route.params.deviceId as string);

const hasPendingConfig = computed(() => Object.keys(pendingConfig.value).length > 0);
const pendingConfigCount = computed(() => Object.keys(pendingConfig.value).length);

// Methods
const loadDevice = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Get device data from Subtronic API
    const data = await subtronicService.getDeviceData(deviceIdFromRoute.value);
    
    // Store previous measurements for trend calculation
    if (deviceData.value) {
      previousMeasurements.value = { ...deviceData.value.measurements };
    }
    
    deviceData.value = data;

    // Determine device type and get template
    const deviceType = determineDeviceType(data);
    deviceTemplate.value = subtronicTemplateService.getSubtronicTemplate(deviceType);

    // Load alarms
    await loadAlarms();

  } catch (err: any) {
    error.value = err.error_message || 'Failed to load Subtronic device data';
    console.error('Error loading Subtronic device:', err);
  } finally {
    loading.value = false;
  }
};

const refreshDevice = async () => {
  refreshing.value = true;
  await loadDevice();
  refreshing.value = false;
};

const loadAlarms = async () => {
  try {
    const alarmData = await subtronicService.getDeviceAlarms(deviceIdFromRoute.value, {
      active_only: true
    });
    alarms.value = alarmData;
  } catch (err) {
    console.error('Error loading alarms:', err);
  }
};

const determineDeviceType = (data: SubtronicDeviceData) => {
  // Logic to determine device type based on available measurements
  if (data.measurements.potential_on !== undefined) {
    return 'cathodic_protection';
  } else if (data.measurements.output_voltage !== undefined) {
    return 'cp_rectifier';
  } else if (data.measurements.potential_1 !== undefined) {
    return 'monitoring_station';
  }
  return 'cathodic_protection'; // Default
};

const getWidgetComponent = (widgetType: string) => {
  switch (widgetType) {
    case 'gauge': return GaugeWidget;
    case 'number': return NumberWidget;
    case 'status': return StatusWidget;
    default: return NumberWidget;
  }
};

const createWidgetConfig = (key: string, mapping: any) => {
  return {
    key,
    label: formatLabel(key),
    widget: mapping.widget_type,
    unit: mapping.unit,
    min: mapping.min,
    max: mapping.max,
    decimals: getDecimals(mapping.unit),
    severityLevels: mapping.severity_levels,
    icon: getIconForField(key),
    color: getColorForField(key)
  };
};

const getMeasurementValue = (key: string, sourceField: string) => {
  if (!deviceData.value) return 0;
  
  // Navigate nested object path (e.g., "measurements.potential_on")
  const path = sourceField.split('.');
  let value = deviceData.value as any;
  
  for (const segment of path) {
    value = value?.[segment];
  }
  
  return value ?? 0;
};

const getPreviousMeasurementValue = (key: string) => {
  return previousMeasurements.value[key];
};

const executeSubtronicCommand = async (command: SubtronicCommandType) => {
  if (requiresConfirmation(command)) {
    const confirmed = confirm(`Are you sure you want to execute: ${formatCommandLabel(command)}?`);
    if (!confirmed) return;
  }

  commandExecuting.value = true;
  try {
    const response = await subtronicService.executeCommand(
      deviceIdFromRoute.value,
      command,
      {} // Parameters would be collected from a modal/form
    );
    
    activeCommands.value.push(response);
    
    // Poll for command status
    pollCommandStatus(response.command_id);
    
  } catch (err: any) {
    error.value = err.error_message || `Failed to execute command: ${command}`;
  } finally {
    commandExecuting.value = false;
  }
};

const pollCommandStatus = async (commandId: string) => {
  const maxPolls = 30; // 5 minutes max
  let pollCount = 0;
  
  const poll = async () => {
    try {
      const status = await subtronicService.getCommandStatus(deviceIdFromRoute.value, commandId);
      
      // Update command in list
      const index = activeCommands.value.findIndex(cmd => cmd.command_id === commandId);
      if (index !== -1) {
        activeCommands.value[index] = status;
      }
      
      // Continue polling if still executing
      if (status.status === 'executing' && pollCount < maxPolls) {
        pollCount++;
        setTimeout(poll, 10000); // Poll every 10 seconds
      }
    } catch (err) {
      console.error('Error polling command status:', err);
    }
  };
  
  setTimeout(poll, 2000); // Start polling after 2 seconds
};

const updateConfiguration = (key: string, value: any) => {
  pendingConfig.value[key] = value;
};

const applyConfiguration = async () => {
  applyingConfig.value = true;
  try {
    // Apply configuration changes via Subtronic API
    const configUpdate = {
      measurement_configuration: {},
      alarm_configuration: { thresholds: {} }
    } as any;
    
    // Map pending config to Subtronic config structure
    for (const [key, value] of Object.entries(pendingConfig.value)) {
      if (key.includes('alarm')) {
        configUpdate.alarm_configuration.thresholds[key] = value;
      } else {
        configUpdate.measurement_configuration[key] = value;
      }
    }
    
    await subtronicService.updateDeviceConfig(deviceIdFromRoute.value, configUpdate);
    
    // Clear pending changes
    pendingConfig.value = {};
    
    // Refresh device data
    await loadDevice();
    
  } catch (err: any) {
    error.value = err.error_message || 'Failed to apply configuration';
  } finally {
    applyingConfig.value = false;
  }
};

const acknowledgeAlarm = async (alarmId: string) => {
  try {
    await subtronicService.acknowledgeAlarm(deviceIdFromRoute.value, alarmId, 'User');
    await loadAlarms(); // Refresh alarms
  } catch (err: any) {
    error.value = err.error_message || 'Failed to acknowledge alarm';
  }
};

const refreshAlarms = async () => {
  await loadAlarms();
};

// Helper methods
const formatLocation = () => {
  if (!deviceData.value?.location) return 'Unknown Location';
  
  const loc = deviceData.value.location;
  if (loc.latitude && loc.longitude) {
    return `${loc.site_name} (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})`;
  }
  return loc.site_name;
};

const getStatusClass = () => {
  const state = deviceData.value?.status.operational_state;
  switch (state) {
    case 'normal': return 'status-normal';
    case 'alarm': return 'status-alarm';
    case 'fault': return 'status-fault';
    case 'maintenance': return 'status-maintenance';
    default: return 'status-offline';
  }
};

const getDataQualityClass = () => {
  const quality = deviceData.value?.quality;
  switch (quality) {
    case 'good': return 'quality-good';
    case 'uncertain': return 'quality-uncertain';
    case 'bad': return 'quality-bad';
    default: return 'quality-offline';
  }
};

const formatLabel = (key: string) => {
  return key.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const formatCommandLabel = (command: SubtronicCommandType) => {
  return command.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const getDecimals = (unit?: string) => {
  if (!unit) return 0;
  if (unit === 'mV' || unit === '°C') return 1;
  if (unit === 'V' || unit === 'A') return 2;
  return 0;
};

const getIconForField = (key: string) => {
  if (key.includes('potential')) return 'bi bi-lightning';
  if (key.includes('current')) return 'bi bi-activity';
  if (key.includes('resistance')) return 'bi bi-diagram-3';
  if (key.includes('temperature')) return 'bi bi-thermometer';
  if (key.includes('battery')) return 'bi bi-battery';
  return 'bi bi-graph-up';
};

const getColorForField = (key: string) => {
  if (key.includes('potential')) return '#f39c12';
  if (key.includes('current')) return '#e74c3c';
  if (key.includes('resistance')) return '#9b59b6';
  if (key.includes('temperature')) return '#ff6b6b';
  if (key.includes('battery')) return '#27ae60';
  return '#6c757d';
};

const getCommandIcon = (command: SubtronicCommandType) => {
  const iconMap: Record<string, string> = {
    restart_device: 'bi bi-arrow-clockwise',
    start_measurement: 'bi bi-play-circle',
    stop_measurement: 'bi bi-stop-circle',
    take_instant_reading: 'bi bi-speedometer2',
    calibrate_potential: 'bi bi-bullseye',
    reset_alarms: 'bi bi-bell-slash',
    run_diagnostics: 'bi bi-tools'
  };
  return iconMap[command] || 'bi bi-gear';
};

const getCommandButtonClass = (command: SubtronicCommandType) => {
  if (command.includes('restart') || command.includes('reset')) return 'btn-danger';
  if (command.includes('calibrate') || command.includes('diagnostics')) return 'btn-warning';
  if (command.includes('start') || command.includes('take')) return 'btn-success';
  return 'btn-primary';
};

const requiresConfirmation = (command: SubtronicCommandType) => {
  return ['restart_device', 'calibrate_potential', 'calibrate_current'].includes(command);
};

const convertToSettingConfig = (key: string, schema: any) => {
  return {
    key,
    label: schema.label,
    type: schema.type,
    unit: schema.unit,
    min: schema.min,
    max: schema.max,
    options: schema.options,
    description: schema.description,
    category: schema.category
  };
};

const getConfigValue = (key: string) => {
  return pendingConfig.value[key] ?? deviceData.value?.configuration?.[key];
};

const formatUptimeDisplay = (uptime?: number) => {
  return formatUptime(uptime);
};

const getAlarmIcon = (alarmType: string) => {
  const iconMap: Record<string, string> = {
    potential_high: 'bi bi-arrow-up-circle',
    potential_low: 'bi bi-arrow-down-circle',
    current_high: 'bi bi-lightning',
    current_low: 'bi bi-battery-half',
    system_fault: 'bi bi-exclamation-triangle',
    communication: 'bi bi-wifi-off'
  };
  return iconMap[alarmType] || 'bi bi-exclamation-circle';
};

const formatAlarmType = (alarmType: string) => {
  return alarmType.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const getAlarmUnit = (alarmType: string) => {
  if (alarmType.includes('potential')) return ' mV';
  if (alarmType.includes('current')) return ' mA';
  return '';
};

const handleWidgetAction = (action: string) => {
  console.log('Widget action:', action);
};

// Lifecycle
onMounted(() => {
  loadDevice();
  
  // Set up periodic refresh
  const refreshInterval = setInterval(() => {
    if (!loading.value && !refreshing.value) {
      refreshDevice();
    }
  }, 30000); // Refresh every 30 seconds
  
  onUnmounted(() => {
    clearInterval(refreshInterval);
  });
});
</script>

<style scoped lang="scss">
.subtronic-device-details {
  min-height: 100vh;
  background: var(--bs-gray-50);
}

.device-header {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 1.5rem 0;
  margin-bottom: 2rem;

  .device-icon {
    width: 4rem;
    height: 4rem;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--bs-border-radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    position: relative;

    &.subtronic-brand {
      .brand-badge {
        position: absolute;
        bottom: -8px;
        right: -8px;
        background: #e74c3c;
        color: white;
        font-size: 0.625rem;
        font-weight: 700;
        padding: 0.125rem 0.375rem;
        border-radius: var(--bs-border-radius-pill);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
  }

  .device-name {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0;
  }

  .device-meta {
    display: flex;
    align-items: center;
    opacity: 0.9;
    font-size: 0.875rem;

    .model-info, .device-id {
      display: flex;
      align-items: center;
    }
  }

  .status-badge {
    display: flex;
    align-items: center;
    padding: 0.375rem 0.75rem;
    border-radius: var(--bs-border-radius-pill);
    font-size: 0.875rem;
    font-weight: 600;

    &.status-normal {
      background: rgba(40, 167, 69, 0.2);
      color: #28a745;
      border: 1px solid rgba(40, 167, 69, 0.3);
    }

    &.status-alarm {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
      border: 1px solid rgba(255, 193, 7, 0.3);
    }

    &.status-fault {
      background: rgba(220, 53, 69, 0.2);
      color: #dc3545;
      border: 1px solid rgba(220, 53, 69, 0.3);
    }

    &.status-offline {
      background: rgba(108, 117, 125, 0.2);
      color: #6c757d;
      border: 1px solid rgba(108, 117, 125, 0.3);
    }
  }
}

.measurements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.system-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;

  .info-card {
    background: var(--bs-white);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .info-icon {
      width: 2.5rem;
      height: 2.5rem;
      background: var(--bs-primary);
      color: white;
      border-radius: var(--bs-border-radius);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .info-content {
      .info-label {
        font-size: 0.75rem;
        color: var(--bs-gray-600);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .info-value {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--bs-gray-900);
      }
    }
  }
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  .command-button {
    background: var(--bs-white);
    border: 2px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
    text-decoration: none;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
    }

    &.btn-primary {
      border-color: var(--bs-primary);
      color: var(--bs-primary);

      &:hover {
        background: var(--bs-primary);
        color: white;
      }
    }

    &.btn-success {
      border-color: var(--bs-success);
      color: var(--bs-success);

      &:hover {
        background: var(--bs-success);
        color: white;
      }
    }

    &.btn-warning {
      border-color: var(--bs-warning);
      color: var(--bs-warning);

      &:hover {
        background: var(--bs-warning);
        color: white;
      }
    }

    &.btn-danger {
      border-color: var(--bs-danger);
      color: var(--bs-danger);

      &:hover {
        background: var(--bs-danger);
        color: white;
      }
    }

    .command-icon {
      font-size: 1.25rem;
    }

    .command-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-align: center;
    }
  }
}

.data-quality {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;

  &.quality-good {
    color: #28a745;
  }

  &.quality-uncertain {
    color: #ffc107;
  }

  &.quality-bad {
    color: #dc3545;
  }

  &.quality-offline {
    color: #6c757d;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--bs-gray-900);
    margin: 0;
    display: flex;
    align-items: center;
  }

  .section-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.875rem;
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .subtronic-device-details {
    background: var(--bs-gray-900);
  }

  .system-info-grid .info-card,
  .commands-grid .command-button {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-700);
  }

  .system-info-grid .info-card .info-content .info-value {
    color: var(--bs-gray-100);
  }

  .section-header .section-title {
    color: var(--bs-gray-100);
  }
}
</style>