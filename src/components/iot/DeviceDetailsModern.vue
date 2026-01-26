<template>
  <div class="device-details-modern">
    <!-- Header Section -->
    <div class="device-header">
      <div class="container-fluid">
        <div class="row align-items-center">
          <!-- Back Button -->
          <div class="col-auto">
            <div class="d-flex gap-2">
              <router-link to="/devices" class="btn btn-light btn-sm">
                <i class="bi bi-arrow-left me-2"></i>
                Back to Devices
              </router-link>
              
              <!-- Template Switcher -->
              <div class="btn-group" role="group">
                <router-link 
                  :to="{ name: 'device-details-legacy', params: { id: deviceIdFromRoute } }"
                  class="btn btn-outline-secondary btn-sm"
                  title="Switch to Legacy UI"
                >
                  <i class="bi bi-arrow-left-right me-1"></i>
                  Legacy
                </router-link>
                <router-link 
                  :to="`/subtronic/devices/${deviceIdFromRoute}`"
                  class="btn btn-outline-primary btn-sm"
                  title="Switch to Subtronic UI"
                >
                  <i class="bi bi-shield-check me-1"></i>
                  Subtronic
                </router-link>
              </div>
            </div>
          </div>

          <!-- Device Info -->
          <div class="col">
            <div class="d-flex align-items-center gap-3">
              <!-- Device Icon -->
              <div class="device-icon" :style="{ backgroundColor: deviceTemplate?.color + '20' }">
                <i :class="deviceTemplate?.icon || 'bi bi-cpu'" :style="{ color: deviceTemplate?.color }"></i>
              </div>

              <!-- Device Details -->
              <div>
                <h1 class="device-name mb-1">{{ device?.name || 'Unknown Device' }}</h1>
                <div class="device-meta">
                  <span class="location">
                    <i class="bi bi-geo-alt me-1"></i>
                    {{ device?.location || 'Unknown Location' }}
                  </span>
                  <span class="device-type ms-3">
                    <i class="bi bi-tag me-1"></i>
                    {{ deviceTemplate?.displayName || 'Generic Device' }}
                  </span>
                  <span class="template-badge ms-3">
                    <span class="badge badge-light-info">Modern UI</span>
                  </span>
                </div>
                <div class="device-id mt-1">
                  <small class="text-muted">Device ID: {{ device?.deviceId }}</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Status & Actions -->
          <div class="col-auto">
            <div class="d-flex align-items-center gap-3">
              <!-- Device Status -->
              <div class="device-status">
                <DeviceStatusBadge :status="device?.status || 'offline'" />
                <div class="last-seen mt-1">
                  <small class="text-muted">
                    Last seen: {{ formatTime(device?.lastSeen) }}
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
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Loading device details...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        {{ error }}
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="device && deviceTemplate" class="device-content">
      <div class="container-fluid">
        <div class="row g-4">
          <!-- Left Column: Telemetry Dashboard -->
          <div class="col-lg-8">
            <!-- Telemetry Widgets -->
            <div class="telemetry-section">
              <div class="section-header">
                <h3 class="section-title">
                  <i class="bi bi-graph-up me-2"></i>
                  Real-time Telemetry
                </h3>
                <div class="section-actions">
                  <span class="connection-status" :class="connectionStatusClass">
                    <i class="bi bi-circle-fill me-1"></i>
                    {{ statusSummary?.connectionStatus || 'Unknown' }}
                  </span>
                </div>
              </div>

              <!-- Dynamic Widget Grid -->
              <div class="widgets-grid" :class="`grid-cols-${deviceTemplate.widgetConfig.columns || 3}`">
                <component
                  v-for="widget in deviceTemplate.widgetConfig.widgets"
                  :key="widget.key"
                  :is="getWidgetComponent(widget.widget)"
                  :widget="widget"
                  :value="getCurrentValue(widget.key)"
                  :previous-value="getPreviousValue(widget.key)"
                  :last-update="device.lastSeen"
                  :loading="refreshing"
                  @action="handleWidgetAction"
                />
              </div>
            </div>

            <!-- Device Matrix (Analytics) -->
            <div class="matrix-section mt-4" v-if="showMatrix">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-grid-3x3-gap me-2"></i>
                  Device Matrix
                </h4>
              </div>
              
              <div class="matrix-grid">
                <div class="matrix-item" v-for="item in deviceMatrix" :key="item.key">
                  <div class="matrix-icon">
                    <i :class="item.icon"></i>
                  </div>
                  <div class="matrix-content">
                    <div class="matrix-label">{{ item.label }}</div>
                    <div class="matrix-value">{{ item.value }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Controls & Settings -->
          <div class="col-lg-4">
            <!-- Device Controls -->
            <div class="controls-section">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-sliders me-2"></i>
                  Device Controls
                </h4>
              </div>

              <div class="controls-grid">
                <button
                  v-for="command in deviceTemplate.commandList"
                  :key="command.key"
                  class="control-button"
                  :class="`btn-${command.color}`"
                  @click="executeCommand(command)"
                  :disabled="commandExecuting"
                >
                  <div class="control-icon">
                    <i :class="command.icon"></i>
                  </div>
                  <div class="control-label">{{ command.label }}</div>
                </button>
              </div>
            </div>

            <!-- Device Settings -->
            <div class="settings-section mt-4">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-gear me-2"></i>
                  Device Settings
                </h4>
                <button 
                  v-if="hasPendingSettings"
                  @click="applySettings"
                  class="btn btn-success btn-sm"
                  :disabled="applyingSettings"
                >
                  <i class="bi bi-check2 me-1"></i>
                  Apply Changes ({{ pendingSettingsCount }})
                </button>
              </div>

              <div class="settings-list">
                <div 
                  v-for="setting in deviceTemplate.settingsSchema"
                  :key="setting.key"
                  class="setting-item"
                >
                  <div class="setting-info">
                    <div class="setting-label">{{ setting.label }}</div>
                    <div class="setting-description" v-if="setting.description">
                      {{ setting.description }}
                    </div>
                  </div>
                  <div class="setting-control">
                    <SettingControl
                      :setting="setting"
                      :value="getSettingValue(setting.key)"
                      @update="updateSetting"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Real-time Status Bar -->
            <div class="status-bar mt-4">
              <div class="section-header">
                <h5 class="section-title">
                  <i class="bi bi-activity me-2"></i>
                  Connection Status
                </h5>
              </div>

              <div class="status-items">
                <div class="status-item">
                  <span class="status-label">MQTT Topic:</span>
                  <span class="status-value">{{ statusSummary?.mqttTopic || 'N/A' }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">Ingestion Delay:</span>
                  <span class="status-value">{{ formatDelay(statusSummary?.ingestionDelay) }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">Uptime:</span>
                  <span class="status-value">{{ formatUptimeDisplay(statusSummary?.uptime) }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">Messages:</span>
                  <span class="status-value">{{ statusSummary?.messageCount || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts & Fault Log -->
        <div class="row mt-4">
          <div class="col-12">
            <div class="alerts-section">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  Alerts & Fault Log
                </h4>
                <div class="section-actions">
                  <button class="btn btn-outline-primary btn-sm" @click="refreshAlerts">
                    <i class="bi bi-arrow-clockwise me-1"></i>
                    Refresh
                  </button>
                </div>
              </div>

              <div class="alerts-list">
                <div 
                  v-for="alert in alertLog"
                  :key="alert.id"
                  class="alert-item"
                  :class="`alert-${alert.severity}`"
                >
                  <div class="alert-icon">
                    <i :class="getAlertIcon(alert.eventType)"></i>
                  </div>
                  <div class="alert-content">
                    <div class="alert-message">{{ alert.message }}</div>
                    <div class="alert-meta">
                      <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
                      <span class="alert-type ms-2">{{ alert.eventType }}</span>
                      <span v-if="alert.value" class="alert-value ms-2">Value: {{ alert.value }}</span>
                    </div>
                  </div>
                  <div class="alert-actions" v-if="!alert.acknowledged && alert.eventType === 'alarm'">
                    <button 
                      class="btn btn-sm btn-outline-success"
                      @click="acknowledgeAlert(alert.id)"
                    >
                      <i class="bi bi-check2 me-1"></i>
                      Acknowledge
                    </button>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-if="alertLog.length === 0" class="empty-alerts">
                  <i class="bi bi-check-circle text-success display-4"></i>
                  <p class="mt-2 text-muted">No alerts or faults recorded</p>
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
import DeviceStatusBadge from './DeviceStatusBadge.vue';
import GaugeWidget from './widgets/GaugeWidget.vue';
import NumberWidget from './widgets/NumberWidget.vue';
import StatusWidget from './widgets/StatusWidget.vue';
import ChartWidget from './widgets/ChartWidget.vue';
import SettingControl from './settings/SettingControl.vue';
import { formatTime, formatUptime, formatDuration } from '@/utils/dateFormatter';
import type { 
  TemplatedDevice, 
  DeviceTemplate, 
  DeviceStatusSummary, 
  AlertLogEntry,
  CommandConfig,
  SettingConfig
} from '@/types/deviceTemplate.types';

// Props
interface Props {
  deviceId?: string;
}

const props = defineProps<Props>();
const route = useRoute();

// Reactive state
const device = ref<TemplatedDevice | null>(null);
const deviceTemplate = ref<DeviceTemplate | null>(null);
const statusSummary = ref<DeviceStatusSummary | null>(null);
const alertLog = ref<AlertLogEntry[]>([]);
const loading = ref(true);
const refreshing = ref(false);
const error = ref<string | null>(null);
const commandExecuting = ref(false);
const applyingSettings = ref(false);
const pendingSettings = ref<Record<string, any>>({});

// Computed properties
const deviceIdFromRoute = computed(() => props.deviceId || route.params.id as string);

const connectionStatusClass = computed(() => {
  const status = statusSummary.value?.connectionStatus;
  switch (status) {
    case 'connected': return 'status-connected';
    case 'reconnecting': return 'status-reconnecting';
    default: return 'status-disconnected';
  }
});

const showMatrix = computed(() => {
  return deviceTemplate.value?.deviceType !== 'generic';
});

const deviceMatrix = computed(() => {
  if (!device.value) return [];
  
  return [
    { key: 'voltage', label: 'Voltage', value: '12.5V', icon: 'bi bi-lightning' },
    { key: 'current', label: 'Current', value: '2.1A', icon: 'bi bi-activity' },
    { key: 'temperature', label: 'Temperature', value: '25°C', icon: 'bi bi-thermometer' },
    { key: 'battery', label: 'Battery', value: '85%', icon: 'bi bi-battery-three-quarters' },
    { key: 'firmware', label: 'Firmware', value: 'v2.1.0', icon: 'bi bi-code-square' },
    { key: 'signal', label: 'Signal', value: '-65dBm', icon: 'bi bi-wifi' }
  ];
});

const hasPendingSettings = computed(() => Object.keys(pendingSettings.value).length > 0);
const pendingSettingsCount = computed(() => Object.keys(pendingSettings.value).length);

// Methods
const loadDevice = async () => {
  try {
    loading.value = true;
    error.value = null;

    console.log('🔍 Loading device with ID:', deviceIdFromRoute.value);

    // Load device data (mock implementation)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock device data - replace with actual API call
    device.value = {
      id: deviceIdFromRoute.value,
      deviceId: deviceIdFromRoute.value,
      name: `Device ${deviceIdFromRoute.value}`,
      location: 'Building A - Floor 2 - Room 201',
      status: 'online',
      lastSeen: new Date().toISOString(),
      currentData: {
        gas_ppm: 45,
        temperature: 25.3,
        humidity: 60,
        battery: 85,
        signal: -65
      },
      settings: {
        threshold_warning: 50,
        threshold_critical: 100,
        sampling_rate: 30,
        alarm_enabled: true
      },
      template: getDeviceTemplate('gas_detector'),
      metadata: {
        firmwareVersion: 'v2.1.0',
        serialNumber: `GD${deviceIdFromRoute.value}-2024`,
        installDate: '2024-01-15'
      }
    };

    deviceTemplate.value = device.value.template;
    
    // Load status summary
    statusSummary.value = {
      connectionStatus: 'connected',
      mqttTopic: `devices/${deviceIdFromRoute.value}/telemetry`,
      ingestionDelay: 150,
      uptime: 86400,
      messageCount: 1440,
      lastMessageTime: new Date().toISOString()
    };

    // Load alert log
    alertLog.value = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        eventType: 'alarm',
        severity: 'warning',
        message: 'Gas concentration approaching warning threshold',
        value: 48,
        parameter: 'gas_ppm',
        acknowledged: false
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        eventType: 'reset',
        severity: 'safe',
        message: 'Device reset completed successfully',
        acknowledged: true,
        acknowledgedBy: 'System',
        acknowledgedAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    console.log('✅ Device loaded successfully:', device.value);

  } catch (err) {
    error.value = 'Failed to load device details';
    console.error('Error loading device:', err);
  } finally {
    loading.value = false;
  }
};

const refreshDevice = async () => {
  refreshing.value = true;
  await loadDevice();
  refreshing.value = false;
};

const getDeviceTemplate = (deviceType: string): DeviceTemplate => {
  // Mock template - replace with actual template loading
  return {
    deviceType: 'gas_detector',
    displayName: 'Gas Detector',
    description: 'Multi-gas detection sensor with real-time monitoring',
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
        severityLevels: {
          safe: '<50',
          warning: '50-100',
          critical: '>100'
        }
      },
      {
        key: 'temperature',
        label: 'Temperature',
        widget: 'number',
        unit: '°C',
        decimals: 1
      },
      {
        key: 'humidity',
        label: 'Humidity',
        widget: 'number',
        unit: '%',
        decimals: 0
      },
      {
        key: 'battery',
        label: 'Battery Level',
        widget: 'gauge',
        unit: '%',
        min: 0,
        max: 100,
        severityLevels: {
          safe: '>40',
          warning: '20-40',
          critical: '<20'
        }
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
    alarmConfig: [],
    commandList: [
      {
        key: 'restart',
        label: 'Restart Device',
        icon: 'bi bi-arrow-clockwise',
        color: 'primary',
        confirmationRequired: true
      },
      {
        key: 'reset_alarm',
        label: 'Reset Alarm',
        icon: 'bi bi-bell-slash',
        color: 'warning'
      },
      {
        key: 'calibrate',
        label: 'Calibrate Sensor',
        icon: 'bi bi-gear',
        color: 'info',
        confirmationRequired: true
      },
      {
        key: 'test_alarm',
        label: 'Test Alarm',
        icon: 'bi bi-bell',
        color: 'danger'
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
        description: 'Gas concentration level that triggers warning'
      },
      {
        key: 'threshold_critical',
        label: 'Critical Threshold',
        type: 'number',
        unit: 'ppm',
        min: 50,
        max: 200,
        description: 'Gas concentration level that triggers critical alarm'
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
        description: 'How often the sensor takes readings'
      },
      {
        key: 'alarm_enabled',
        label: 'Alarm Enabled',
        type: 'boolean',
        description: 'Enable or disable alarm notifications'
      }
    ],
    deviceModel: {
      manufacturer: 'Zeptac',
      model: 'GD-2000',
      version: '2.1',
      capabilities: ['gas_detection', 'temperature', 'humidity', 'wireless']
    }
  };
};

const getWidgetComponent = (widgetType: string) => {
  switch (widgetType) {
    case 'gauge': return GaugeWidget;
    case 'number': return NumberWidget;
    case 'status': return StatusWidget;
    case 'chart': return ChartWidget;
    default: return NumberWidget;
  }
};

const getCurrentValue = (key: string) => {
  return device.value?.currentData[key] ?? 0;
};

const getPreviousValue = (key: string) => {
  // Mock previous value - implement actual historical data
  const current = getCurrentValue(key);
  return typeof current === 'number' ? current * 0.95 : current;
};

const getSettingComponent = (type: string) => {
  // Return appropriate setting component based on type
  return SettingControl; // Use our unified SettingControl component
};

const getSettingValue = (key: string) => {
  return pendingSettings.value[key] ?? device.value?.settings[key];
};

const updateSetting = (key: string, value: any) => {
  pendingSettings.value[key] = value;
};

const applySettings = async () => {
  applyingSettings.value = true;
  try {
    // Apply settings via API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update device settings
    if (device.value) {
      Object.assign(device.value.settings, pendingSettings.value);
    }
    
    // Clear pending settings
    pendingSettings.value = {};
    
  } catch (err) {
    console.error('Error applying settings:', err);
  } finally {
    applyingSettings.value = false;
  }
};

const executeCommand = async (command: CommandConfig) => {
  if (command.confirmationRequired) {
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to ${command.label.toLowerCase()}?`);
    if (!confirmed) return;
  }

  commandExecuting.value = true;
  try {
    // Execute command via API
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Executed command: ${command.key}`);
  } catch (err) {
    console.error('Error executing command:', err);
  } finally {
    commandExecuting.value = false;
  }
};

const handleWidgetAction = (action: string) => {
  console.log('Widget action:', action);
};

const refreshAlerts = async () => {
  // Refresh alert log
  await loadDevice();
};

const acknowledgeAlert = async (alertId: string) => {
  const alert = alertLog.value.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedBy = 'User';
    alert.acknowledgedAt = new Date().toISOString();
  }
};

const getAlertIcon = (eventType: string) => {
  switch (eventType) {
    case 'alarm': return 'bi bi-exclamation-triangle-fill';
    case 'fault': return 'bi bi-x-circle-fill';
    case 'reset': return 'bi bi-arrow-clockwise';
    case 'acknowledge': return 'bi bi-check-circle-fill';
    default: return 'bi bi-info-circle-fill';
  }
};

const formatDelay = (delay?: number) => {
  return formatDuration(delay);
};

const formatUptimeDisplay = (uptime?: number) => {
  return formatUptime(uptime);
};

// Lifecycle
onMounted(() => {
  loadDevice();
});
</script>

<style scoped lang="scss">
.device-details-modern {
  min-height: 100vh;
  background: var(--bs-gray-50);
}

.device-header {
  background: var(--bs-white);
  border-bottom: 1px solid var(--bs-border-color);
  padding: 1.5rem 0;
  margin-bottom: 2rem;

  .device-icon {
    width: 4rem;
    height: 4rem;
    border-radius: var(--bs-border-radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
  }

  .device-name {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--bs-gray-900);
    margin: 0;
  }

  .device-meta {
    display: flex;
    align-items: center;
    color: var(--bs-gray-600);
    font-size: 0.875rem;

    .location, .device-type {
      display: flex;
      align-items: center;
    }
  }

  .device-status {
    text-align: right;
  }
}

.device-content {
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

    .connection-status {
      display: flex;
      align-items: center;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.375rem 0.75rem;
      border-radius: var(--bs-border-radius-pill);

      &.status-connected {
        color: var(--bs-success);
        background: rgba(var(--bs-success-rgb), 0.1);
      }

      &.status-reconnecting {
        color: var(--bs-warning);
        background: rgba(var(--bs-warning-rgb), 0.1);
      }

      &.status-disconnected {
        color: var(--bs-danger);
        background: rgba(var(--bs-danger-rgb), 0.1);
      }
    }
  }
}

.widgets-grid {
  display: grid;
  gap: 1.5rem;

  &.grid-cols-1 { grid-template-columns: 1fr; }
  &.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  &.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  &.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

  @media (max-width: 1200px) {
    &.grid-cols-4 { grid-template-columns: repeat(2, 1fr); }
    &.grid-cols-3 { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.matrix-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;

  .matrix-item {
    background: var(--bs-white);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .matrix-icon {
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

    .matrix-content {
      .matrix-label {
        font-size: 0.75rem;
        color: var(--bs-gray-600);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .matrix-value {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--bs-gray-900);
      }
    }
  }
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  .control-button {
    background: var(--bs-white);
    border: 2px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.3s ease;
    text-decoration: none;
    color: var(--bs-gray-700);

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

    &.btn-warning {
      border-color: var(--bs-warning);
      color: var(--bs-warning);

      &:hover {
        background: var(--bs-warning);
        color: white;
      }
    }

    &.btn-info {
      border-color: var(--bs-info);
      color: var(--bs-info);

      &:hover {
        background: var(--bs-info);
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

    .control-icon {
      font-size: 1.5rem;
    }

    .control-label {
      font-size: 0.875rem;
      font-weight: 600;
      text-align: center;
    }
  }
}

.settings-list {
  .setting-item {
    background: var(--bs-white);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    padding: 1rem;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .setting-info {
      flex: 1;

      .setting-label {
        font-weight: 600;
        color: var(--bs-gray-900);
        margin-bottom: 0.25rem;
      }

      .setting-description {
        font-size: 0.75rem;
        color: var(--bs-gray-600);
      }
    }

    .setting-control {
      min-width: 120px;
    }
  }
}

.status-bar {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  padding: 1rem;

  .status-items {
    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--bs-border-color);

      &:last-child {
        border-bottom: none;
      }

      .status-label {
        font-size: 0.875rem;
        color: var(--bs-gray-600);
        font-weight: 500;
      }

      .status-value {
        font-size: 0.875rem;
        color: var(--bs-gray-900);
        font-weight: 600;
      }
    }
  }
}

.alerts-list {
  .alert-item {
    background: var(--bs-white);
    border: 1px solid var(--bs-border-color);
    border-left: 4px solid var(--bs-gray-300);
    border-radius: var(--bs-border-radius-lg);
    padding: 1rem;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;

    &.alert-safe {
      border-left-color: var(--bs-success);
    }

    &.alert-warning {
      border-left-color: var(--bs-warning);
    }

    &.alert-critical {
      border-left-color: var(--bs-danger);
    }

    .alert-icon {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      background: var(--bs-gray-100);
      color: var(--bs-gray-600);
    }

    .alert-content {
      flex: 1;

      .alert-message {
        font-weight: 600;
        color: var(--bs-gray-900);
        margin-bottom: 0.25rem;
      }

      .alert-meta {
        font-size: 0.75rem;
        color: var(--bs-gray-600);

        .alert-time,
        .alert-type,
        .alert-value {
          margin-right: 0.5rem;
        }
      }
    }

    .alert-actions {
      display: flex;
      gap: 0.5rem;
    }
  }

  .empty-alerts {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--bs-gray-600);
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .device-details-modern {
    background: var(--bs-gray-900);
  }

  .device-header {
    background: var(--bs-gray-800);
    border-bottom-color: var(--bs-gray-700);

    .device-name {
      color: var(--bs-gray-100);
    }

    .device-meta {
      color: var(--bs-gray-400);
    }
  }

  .device-content .section-header .section-title {
    color: var(--bs-gray-100);
  }

  .matrix-grid .matrix-item,
  .settings-list .setting-item,
  .status-bar,
  .alerts-list .alert-item {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-700);
  }

  .matrix-grid .matrix-item .matrix-content .matrix-value,
  .settings-list .setting-item .setting-info .setting-label {
    color: var(--bs-gray-100);
  }

  .controls-grid .control-button {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-700);
    color: var(--bs-gray-300);
  }

  .status-bar .status-items .status-item .status-value,
  .alerts-list .alert-item .alert-content .alert-message {
    color: var(--bs-gray-100);
  }
}
</style>