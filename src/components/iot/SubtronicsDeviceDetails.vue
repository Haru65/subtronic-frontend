<template>
  <div class="subtronics-device-details">
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
              <!-- Subtronics Logo/Icon -->
              <div class="device-icon subtronics-brand">
                <i :class="gasTypeIcon"></i>
                <div class="brand-badge">Subtronics</div>
              </div>

              <!-- Device Details -->
              <div>
                <h1 class="device-name mb-1">{{ deviceData?.device_name || 'Subtronics Gas Monitor' }}</h1>
                <div class="device-meta">
                  <span class="model-info">
                    <i class="bi bi-cpu me-1"></i>
                    {{ deviceTemplate?.model_info.model }} {{ deviceTemplate?.model_info.series }}
                  </span>
                  <span class="device-id ms-3">
                    <i class="bi bi-tag me-1"></i>
                    {{ deviceData?.serial_number || deviceId }}
                  </span>
                </div>
                <div class="gas-type-info mt-1">
                  <small class="gas-type-badge" :style="{ backgroundColor: gasTypeColor }">
                    <i :class="gasTypeIcon" class="me-1"></i>
                    {{ formatGasType(deviceData?.gas_type) }}
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
                  {{ getStatusText() }}
                </span>
                <div class="last-communication mt-1">
                  <small class="text-muted">
                    Last data: {{ formatTime(deviceData?.timestamp) }}
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
          <span class="visually-hidden">Loading Subtronics device...</span>
        </div>
        <p class="mt-3 text-muted">Connecting to Subtronics API...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Subtronics API Error:</strong> {{ error }}
        <button @click="loadDevice" class="btn btn-outline-danger btn-sm ms-3">
          <i class="bi bi-arrow-clockwise me-1"></i>
          Retry
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="deviceData && deviceTemplate" class="device-content">
      <div class="container-fluid">
        <div class="row g-4">
          <!-- Left Column: Main KPI Cards -->
          <div class="col-lg-8">
            <!-- Primary Measurements -->
            <div class="measurements-section">
              <div class="section-header">
                <h3 class="section-title">
                  <i class="bi bi-activity me-2"></i>
                  Gas Monitor Readings
                </h3>
                <div class="section-actions">
                  <span class="data-quality" :class="getDataQualityClass()">
                    <i class="bi bi-circle-fill me-1"></i>
                    {{ deviceData.data_quality }}
                  </span>
                  <span class="measurement-time ms-3">
                    <i class="bi bi-clock me-1"></i>
                    {{ formatTime(deviceData.timestamp) }}
                  </span>
                </div>
              </div>

              <!-- Main KPI Grid -->
              <div class="kpi-grid">
                <!-- Gas Concentration Gauge -->
                <GaugeWidget
                  :widget="gasConcentrationWidget"
                  :value="currentGasReading"
                  :previous-value="previousGasReading"
                  :last-update="deviceData.timestamp"
                  :loading="refreshing"
                  @action="handleWidgetAction"
                />

                <!-- Gas Concentration Line Chart -->
                <GasConcentrationChart
                  :widget="gasChartWidget"
                  :current-value="currentGasReading"
                  :a1-level="deviceData?.a1_level ?? 250"
                  :a2-level="deviceData?.a2_level ?? 500"
                  :a3-level="deviceData?.a3_level ?? 1000"
                  :last-update="deviceData?.timestamp ?? ''"
                  :loading="refreshing"
                  @action="handleWidgetAction"
                />
              </div>
            </div>

            <!-- Device Matrix Section -->
            <div class="device-matrix-section mt-4">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-grid me-2"></i>
                  Device Configuration Matrix
                </h4>
              </div>
              
              <div class="matrix-grid">
                <!-- Configuration Values -->
                <div class="matrix-card">
                  <div class="matrix-icon">
                    <i class="bi bi-arrow-up-down"></i>
                  </div>
                  <div class="matrix-content">
                    <div class="matrix-label">Offset</div>
                    <div class="matrix-value">{{ deviceData.offset }} {{ deviceData.unit }}</div>
                  </div>
                </div>
                
                <div class="matrix-card">
                  <div class="matrix-icon">
                    <i class="bi bi-arrow-up"></i>
                  </div>
                  <div class="matrix-content">
                    <div class="matrix-label">Span High</div>
                    <div class="matrix-value">{{ deviceData.span_high }} {{ deviceData.unit }}</div>
                  </div>
                </div>
                
                <div class="matrix-card">
                  <div class="matrix-icon">
                    <i class="bi bi-arrow-down"></i>
                  </div>
                  <div class="matrix-content">
                    <div class="matrix-label">Span Low</div>
                    <div class="matrix-value">{{ deviceData.span_low }} {{ deviceData.unit }}</div>
                  </div>
                </div>
                
                <div class="matrix-card">
                  <div class="matrix-icon">
                    <i class="bi bi-123"></i>
                  </div>
                  <div class="matrix-content">
                    <div class="matrix-label">Decimal Point</div>
                    <div class="matrix-value">{{ deviceData.decimal_point }}</div>
                  </div>
                </div>
                
                <!-- Alarm Levels -->
                <div class="matrix-card alarm-card">
                  <div class="matrix-icon alarm-a1">
                    <i class="bi bi-exclamation-circle"></i>
                  </div>
                  <div class="matrix-content">
                    <div class="matrix-label">A1 Level</div>
                    <div class="matrix-value">{{ deviceData.a1_level }} {{ deviceData.unit }}</div>
                  </div>
                </div>
                
                <div class="matrix-card alarm-card">
                  <div class="matrix-icon alarm-a2">
                    <i class="bi bi-exclamation-triangle"></i>
                  </div>
                  <div class="matrix-content">
                    <div class="matrix-label">A2 Level</div>
                    <div class="matrix-value">{{ deviceData.a2_level }} {{ deviceData.unit }}</div>
                  </div>
                </div>
                
                <div class="matrix-card alarm-card">
                  <div class="matrix-icon alarm-a3">
                    <i class="bi bi-exclamation-diamond"></i>
                  </div>
                  <div class="matrix-content">
                    <div class="matrix-label">A3 Level</div>
                    <div class="matrix-value">{{ deviceData.a3_level }} {{ deviceData.unit }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Alarms & Status -->
          <div class="col-lg-4">
            <!-- Alarm LED Status -->
            <div class="alarm-status-section">
              <div class="section-header">
                <h4 class="section-title">
                  <i class="bi bi-lightbulb me-2"></i>
                  Alarm LED Status
                </h4>
              </div>

              <div class="alarm-leds-grid">
                <LedWidget
                  :widget="alarm1LedWidget"
                  :value="deviceData.alarm1_led"
                  :last-update="deviceData.timestamp"
                  :loading="refreshing"
                  alarm-level="a1"
                  :alarm-threshold="deviceData.a1_level"
                  @action="handleWidgetAction"
                />
                
                <LedWidget
                  :widget="alarm2LedWidget"
                  :value="deviceData.alarm2_led"
                  :last-update="deviceData.timestamp"
                  :loading="refreshing"
                  alarm-level="a2"
                  :alarm-threshold="deviceData.a2_level"
                  @action="handleWidgetAction"
                />
                
                <LedWidget
                  :widget="alarm3LedWidget"
                  :value="deviceData.alarm3_led"
                  :last-update="deviceData.timestamp"
                  :loading="refreshing"
                  alarm-level="a3"
                  :alarm-threshold="deviceData.a3_level"
                  @action="handleWidgetAction"
                />
              </div>
            </div>

            <!-- Sensor Fault Status -->
            <div class="sensor-fault-section mt-4">
              <div class="section-header">
                <h5 class="section-title">
                  <i class="bi bi-shield-exclamation me-2"></i>
                  Sensor Status
                </h5>
              </div>

              <div class="card">
                <div class="card-body">
                  <div class="status-widget-content">
                    <!-- Status Icon -->
                    <div class="status-icon-container" :class="`status-${sensorFaultStatus.severity}`">
                      <div class="status-icon-wrapper">
                        <i :class="sensorFaultStatus.icon" class="status-icon"></i>
                      </div>
                      <div class="status-pulse" v-if="sensorFaultStatus.severity === 'critical'"></div>
                    </div>

                    <!-- Status Text -->
                    <div class="status-text">
                      <div class="status-value" :class="`text-${sensorFaultStatus.severity}`">
                        {{ sensorFaultStatus.text }}
                      </div>
                      <div class="status-description">
                        {{ sensorFaultStatus.description }}
                      </div>
                    </div>

                    <!-- Status Details -->
                    <div class="status-details">
                      <div class="detail-item">
                        <span class="detail-label">Raw Value:</span>
                        <span class="detail-value">{{ deviceData.sensor_fault }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Last Update:</span>
                        <span class="detail-value text-muted">{{ formatTime(deviceData.timestamp) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Connection Status -->
            <div class="connection-status-section mt-4">
              <div class="section-header">
                <h5 class="section-title">
                  <i class="bi bi-wifi me-2"></i>
                  Connection Status
                </h5>
              </div>

              <div class="connection-info">
                <div class="connection-item">
                  <div class="connection-label">Current Reading</div>
                  <div class="connection-value">
                    <span class="reading-value" :class="getReadingClass()">
                      {{ deviceData.sensor_reading }} {{ deviceData.unit }}
                    </span>
                  </div>
                </div>
                
                <div class="connection-item">
                  <div class="connection-label">Alarm Status</div>
                  <div class="connection-value">
                    <span class="alarm-status-badge" :class="getAlarmStatusClass()">
                      {{ deviceData.alarm_status }}
                    </span>
                  </div>
                </div>
                
                <div class="connection-item">
                  <div class="connection-label">MQTT Topic</div>
                  <div class="connection-value">
                    <code>SubTronics/data</code>
                  </div>
                </div>
                
                <div class="connection-item">
                  <div class="connection-label">Last Updated</div>
                  <div class="connection-value">{{ formatTime(deviceData.timestamp) }}</div>
                </div>
                
                <div class="connection-item">
                  <div class="connection-label">Data Quality</div>
                  <div class="connection-value">
                    <span class="quality-badge" :class="getDataQualityClass()">
                      {{ deviceData.data_quality }}
                    </span>
                  </div>
                </div>
                
                <div class="connection-item">
                  <div class="connection-label">Message Type</div>
                  <div class="connection-value">{{ deviceData.message_type }}</div>
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
import LedWidget from './widgets/LedWidget.vue';
import GasConcentrationChart from './widgets/GasConcentrationChart.vue';
import { subtronicsService } from '@/services/subtronics.service';
import { subtronicsTemplateService } from '@/services/subtronicsTemplate.service';
import { io, Socket } from 'socket.io-client';
import { formatTime } from '@/utils/dateFormatter';
import type { 
  SubtronicsDeviceData,
  SubtronicsDeviceTemplate,
  SubtronicsAlert,
  SubtronicsWidgetConfig
} from '@/types/subtronics.types';

// Props
interface Props {
  deviceId?: string;
}

const props = defineProps<Props>();
const route = useRoute();

// Reactive state
const deviceData = ref<SubtronicsDeviceData | null>(null);
const deviceTemplate = ref<SubtronicsDeviceTemplate | null>(null);
const alerts = ref<SubtronicsAlert[]>([]);
const loading = ref(true);
const refreshing = ref(false);
const error = ref<string | null>(null);
const previousGasReading = ref<number>(0);
let socket: Socket | null = null;

// Computed properties
const deviceIdFromRoute = computed(() => props.deviceId || route.params.deviceId as string);

const currentGasReading = computed(() => {
  // The gas simulator updates the "Offset" parameter with the current gas concentration
  // Backend normalizes this to the offset field
  return deviceData.value?.offset ?? 0;
});

const gasTypeIcon = computed(() => {
  if (!deviceData.value?.gas_type) return 'bi bi-cloud';
  return subtronicsTemplateService.getGasTypeIcon(deviceData.value.gas_type);
});

const gasTypeColor = computed(() => {
  if (!deviceData.value?.gas_type) return '#6c757d';
  return subtronicsTemplateService.getGasTypeColor(deviceData.value.gas_type);
});

const hasActiveAlerts = computed(() => 
  alerts.value.some(alert => !alert.acknowledged_at)
);

// Widget configurations
const gasConcentrationWidget = computed((): SubtronicsWidgetConfig => {
  if (!deviceData.value) return subtronicsTemplateService.getDefaultTemplate().widget_mappings.gas_concentration;
  
  return subtronicsTemplateService.createGasConcentrationWidget(
    deviceData.value.span_high,
    deviceData.value.a1_level,
    deviceData.value.a2_level,
    deviceData.value.a3_level,
    deviceData.value.unit
  );
});

const alarm1LedWidget = computed(() => 
  subtronicsTemplateService.getDefaultTemplate().widget_mappings.alarm1_led
);

const alarm2LedWidget = computed(() => 
  subtronicsTemplateService.getDefaultTemplate().widget_mappings.alarm2_led
);

const alarm3LedWidget = computed(() => 
  subtronicsTemplateService.getDefaultTemplate().widget_mappings.alarm3_led
);

const sensorFaultWidget = computed(() => 
  subtronicsTemplateService.getDefaultTemplate().widget_mappings.sensor_fault
);

// Map sensor_fault value: 0 = ON (working), 1 = OFF (fault)
const sensorFaultStatus = computed(() => {
  const faultValue = deviceData.value?.sensor_fault;
  
  // Convert to number if it's a string
  const numericValue = typeof faultValue === 'string' ? parseInt(faultValue, 10) : faultValue;
  
  if (numericValue === 0) {
    return {
      text: 'ON',
      description: 'Sensor is operational',
      icon: 'bi bi-check-circle-fill',
      severity: 'safe'
    };
  } else if (numericValue === 1) {
    return {
      text: 'OFF',
      description: 'Sensor fault detected',
      icon: 'bi bi-x-circle-fill',
      severity: 'critical'
    };
  } else {
    return {
      text: 'Unknown',
      description: 'Sensor status unknown',
      icon: 'bi bi-question-circle-fill',
      severity: 'warning'
    };
  }
});

const gasChartWidget = computed((): SubtronicsWidgetConfig => ({
  key: 'gas_concentration_chart',
  label: 'Gas Concentration Trend',
  widget: 'chart',
  unit: deviceData.value?.unit || 'ppm',
  icon: 'bi bi-graph-up',
  color: '#007bff'
}));

// WebSocket connection
const connectWebSocket = () => {
  try {
    const backendUrl = import.meta.env.VITE_SUBTRONICS_API_URL || 'http://localhost:3002';
    
    console.log('🔌 Connecting to WebSocket:', backendUrl);
    
    socket = io(backendUrl, {
      transports: ['polling', 'websocket'], // Start with polling, then upgrade to websocket
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
      forceNew: true
    });
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      // Subscribe to device updates
      socket?.emit('subscribe:device', deviceIdFromRoute.value);
    });
    
    socket.on('device:data', ({ deviceId, data }) => {
      if (deviceId === deviceIdFromRoute.value) {
        console.log('📨 Received real-time data:', data);
        
        // Store previous reading
        if (deviceData.value) {
          previousGasReading.value = deviceData.value.offset;
        }
        
        // Update device data
        deviceData.value = data;
      }
    });
    
    socket.on('device:alerts', ({ deviceId, alerts: newAlerts }) => {
      if (deviceId === deviceIdFromRoute.value) {
        console.log('🚨 Received alerts:', newAlerts);
        alerts.value = [...alerts.value, ...newAlerts];
      }
    });
    
    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });
    
    socket.on('connect_error', (err) => {
      console.error('🚨 WebSocket connection error:', err.message);
    });
    
    socket.on('error', (err) => {
      console.error('🚨 WebSocket error:', err);
    });
  } catch (err) {
    console.error('🚨 Failed to initialize WebSocket:', err);
  }
};

const disconnectWebSocket = () => {
  if (socket) {
    socket.emit('unsubscribe:device', deviceIdFromRoute.value);
    socket.disconnect();
    socket = null;
  }
};

// Methods
const loadDevice = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Get device data from Subtronics API
    const data = await subtronicsService.getLatestTelemetry(deviceIdFromRoute.value);
    
    // Store previous reading for trend calculation
    if (deviceData.value) {
      previousGasReading.value = deviceData.value.offset;
    }
    
    deviceData.value = data;

    // Get device template
    deviceTemplate.value = subtronicsTemplateService.getDefaultTemplate();

    // Load alerts
    await loadAlerts();

  } catch (err: any) {
    error.value = err.error_message || 'Failed to load Subtronics device data';
    console.error('Error loading Subtronics device:', err);
  } finally {
    loading.value = false;
  }
};

const refreshDevice = async () => {
  // Prevent multiple simultaneous refreshes
  if (refreshing.value || loading.value) {
    return;
  }
  
  try {
    refreshing.value = true;
    
    // Get device data from Subtronics API
    const data = await subtronicsService.getLatestTelemetry(deviceIdFromRoute.value);
    
    // Only update if data actually changed
    if (JSON.stringify(data) !== JSON.stringify(deviceData.value)) {
      // Store previous reading for trend calculation
      if (deviceData.value) {
        previousGasReading.value = deviceData.value.offset;
      }
      
      deviceData.value = data;
    }
  } catch (err: any) {
    console.error('Error refreshing Subtronics device:', err);
    // Don't show error on refresh failures, just log them
  } finally {
    refreshing.value = false;
  }
};

const loadAlerts = async () => {
  try {
    const alertData = await subtronicsService.getDeviceAlerts(deviceIdFromRoute.value);
    alerts.value = alertData;
  } catch (err) {
    console.error('Error loading alerts:', err);
  }
};

const refreshAlerts = async () => {
  await loadAlerts();
};

const acknowledgeAlert = async (alertId: string) => {
  try {
    await subtronicsService.acknowledgeAlert(deviceIdFromRoute.value, alertId, 'User');
    await loadAlerts(); // Refresh alerts
  } catch (err: any) {
    error.value = err.error_message || 'Failed to acknowledge alert';
  }
};

const acknowledgeAllAlerts = async () => {
  const activeAlerts = alerts.value.filter(alert => !alert.acknowledged_at);
  
  for (const alert of activeAlerts) {
    try {
      await subtronicsService.acknowledgeAlert(deviceIdFromRoute.value, alert.id, 'User');
    } catch (err) {
      console.error(`Failed to acknowledge alert ${alert.id}:`, err);
    }
  }
  
  await loadAlerts(); // Refresh alerts
};

// Helper methods
const formatGasType = (gasType?: string) => {
  if (!gasType) return 'Unknown Gas';
  return subtronicsTemplateService.formatGasType(gasType);
};

const getStatusClass = () => {
  if (!deviceData.value) return 'status-offline';
  
  // Use alarm_status field first, then fall back to LED analysis
  if (deviceData.value.alarm_status === 'ALARM') {
    return 'status-critical';
  }
  
  const severity = subtronicsTemplateService.getAlarmSeverity(
    deviceData.value.alarm1_led,
    deviceData.value.alarm2_led,
    deviceData.value.alarm3_led,
    deviceData.value.sensor_fault
  );
  
  return `status-${severity.level}`;
};

const getStatusText = () => {
  if (!deviceData.value) return 'Offline';
  
  // Use alarm_status field first
  if (deviceData.value.alarm_status === 'ALARM') {
    return 'ALARM ACTIVE';
  } else if (deviceData.value.alarm_status === 'NORMAL') {
    return 'Normal Operation';
  }
  
  const severity = subtronicsTemplateService.getAlarmSeverity(
    deviceData.value.alarm1_led,
    deviceData.value.alarm2_led,
    deviceData.value.alarm3_led,
    deviceData.value.sensor_fault
  );
  
  return severity.message;
};

const getDataQualityClass = () => {
  const quality = deviceData.value?.data_quality;
  switch (quality) {
    case 'good': return 'quality-good';
    case 'uncertain': return 'quality-uncertain';
    case 'bad': return 'quality-bad';
    default: return 'quality-offline';
  }
};

const getReadingClass = () => {
  if (!deviceData.value) return '';
  
  const reading = deviceData.value.sensor_reading;
  const a1 = deviceData.value.a1_level;
  const a2 = deviceData.value.a2_level;
  const a3 = deviceData.value.a3_level;
  
  if (reading >= a3) return 'reading-critical';
  if (reading >= a2) return 'reading-high';
  if (reading >= a1) return 'reading-warning';
  return 'reading-normal';
};

const getAlarmStatusClass = () => {
  const status = deviceData.value?.alarm_status;
  switch (status) {
    case 'ALARM': return 'alarm-status-alarm';
    case 'NORMAL': return 'alarm-status-normal';
    default: return 'alarm-status-unknown';
  }
};

const getAlertIcon = (alertType: string) => {
  const iconMap: Record<string, string> = {
    sensor_fault: 'bi bi-exclamation-triangle-fill',
    alarm_level_1: 'bi bi-exclamation-circle',
    alarm_level_2: 'bi bi-exclamation-triangle',
    alarm_level_3: 'bi bi-exclamation-diamond'
  };
  return iconMap[alertType] || 'bi bi-exclamation-circle';
};

const formatAlertType = (alertType: string) => {
  return alertType.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const handleWidgetAction = (action: string) => {
  console.log('Widget action:', action);
};

// Lifecycle
onMounted(async () => {
  await loadDevice();
  
  // Connect to WebSocket for real-time updates
  connectWebSocket();
});

onUnmounted(() => {
  disconnectWebSocket();
});
</script>

<style scoped lang="scss">
.subtronics-device-details {
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

    &.subtronics-brand {
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

  .gas-type-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: var(--bs-border-radius-pill);
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    opacity: 0.9;
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

    &.status-warning {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
      border: 1px solid rgba(255, 193, 7, 0.3);
    }

    &.status-high {
      background: rgba(253, 126, 20, 0.2);
      color: #fd7e14;
      border: 1px solid rgba(253, 126, 20, 0.3);
    }

    &.status-critical {
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

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.matrix-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;

  .matrix-card {
    background: var(--bs-white);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
    }

    &.alarm-card {
      border-left: 4px solid var(--bs-warning);
    }

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

      &.alarm-a1 {
        background: #ffc107;
      }

      &.alarm-a2 {
        background: #fd7e14;
      }

      &.alarm-a3 {
        background: #dc3545;
      }
    }

    .matrix-content {
      flex: 1;

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

.alarm-leds-grid {
  display: grid;
  gap: 1rem;
}

.connection-info {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  padding: 1rem;

  .connection-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--bs-border-color);

    &:last-child {
      border-bottom: none;
    }

    .connection-label {
      font-size: 0.875rem;
      color: var(--bs-gray-600);
      font-weight: 500;
    }

    .connection-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--bs-gray-900);

      code {
        font-size: 0.75rem;
        background: var(--bs-gray-100);
        padding: 0.25rem 0.5rem;
        border-radius: var(--bs-border-radius);
      }
    }
  }
}

// Sensor Status Widget Styles
.sensor-fault-section {
  .card {
    background: var(--bs-white);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
  }

  .card-body {
    background: var(--bs-white);
  }

  .status-widget-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 1rem;
    padding: 1rem;
    background: var(--bs-white);
  }

  .status-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    .status-icon-wrapper {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;

      .status-icon {
        font-size: 2rem;
      }
    }

    .status-pulse {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      z-index: 1;
    }

    // Status-specific styling
    &.status-safe {
      .status-icon-wrapper {
        background: rgba(40, 167, 69, 0.1);
        border: 2px solid #28a745;

        .status-icon {
          color: #28a745;
        }
      }
    }

    &.status-warning {
      .status-icon-wrapper {
        background: rgba(255, 193, 7, 0.1);
        border: 2px solid #ffc107;

        .status-icon {
          color: #ffc107;
        }
      }
    }

    &.status-critical {
      .status-icon-wrapper {
        background: rgba(220, 53, 69, 0.1);
        border: 2px solid #dc3545;

        .status-icon {
          color: #dc3545;
        }
      }

      .status-pulse {
        background: #dc3545;
        animation: pulse-status 2s infinite;
      }
    }
  }

  .status-text {
    text-align: center;

    .status-value {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;

      &.text-safe {
        color: #28a745;
      }

      &.text-warning {
        color: #ffc107;
      }

      &.text-critical {
        color: #dc3545;
      }
    }

    .status-description {
      font-size: 0.875rem;
      color: var(--bs-gray-600);
      line-height: 1.4;
    }
  }

  .status-details {
    width: 100%;
    border-top: 1px solid var(--bs-border-color);
    padding-top: 1rem;
    margin-top: 1rem;

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      font-size: 0.875rem;

      .detail-label {
        color: var(--bs-gray-600);
        font-weight: 500;
      }

      .detail-value {
        font-weight: 600;
        color: var(--bs-gray-900);
      }
    }
  }
}

@keyframes pulse-status {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.quality-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--bs-border-radius-pill);
  font-size: 0.75rem;
  font-weight: 600;

  &.quality-good {
    background: rgba(40, 167, 69, 0.2);
    color: #28a745;
  }

  &.quality-uncertain {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
  }

  &.quality-bad {
    background: rgba(220, 53, 69, 0.2);
    color: #dc3545;
  }

  &.quality-offline {
    background: rgba(108, 117, 125, 0.2);
    color: #6c757d;
  }
}

.reading-value {
  font-weight: 700;
  font-size: 1.125rem;
  
  &.reading-normal {
    color: #28a745;
  }
  
  &.reading-warning {
    color: #ffc107;
  }
  
  &.reading-high {
    color: #fd7e14;
  }
  
  &.reading-critical {
    color: #dc3545;
    animation: pulse 2s infinite;
  }
}

.alarm-status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--bs-border-radius-pill);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  
  &.alarm-status-normal {
    background: rgba(40, 167, 69, 0.2);
    color: #28a745;
  }
  
  &.alarm-status-alarm {
    background: rgba(220, 53, 69, 0.2);
    color: #dc3545;
    animation: pulse 1.5s infinite;
  }
  
  &.alarm-status-unknown {
    background: rgba(108, 117, 125, 0.2);
    color: #6c757d;
  }
}

.alerts-list {
  .alert-item {
    background: var(--bs-white);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;

    &.alert-warning {
      border-left: 4px solid #ffc107;
    }

    &.alert-high {
      border-left: 4px solid #fd7e14;
    }

    &.alert-critical {
      border-left: 4px solid #dc3545;
    }

    .alert-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      background: var(--bs-gray-100);
      color: var(--bs-gray-600);
    }

    .alert-content {
      flex: 1;

      .alert-message {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .alert-meta {
        font-size: 0.875rem;
        color: var(--bs-gray-600);
      }
    }
  }

  .empty-alerts {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--bs-gray-600);
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
  .subtronics-device-details {
    background: var(--bs-gray-900);
  }

  .matrix-grid .matrix-card,
  .connection-info,
  .alerts-list .alert-item {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-700);
  }

  .matrix-grid .matrix-card .matrix-content .matrix-value,
  .connection-info .connection-item .connection-value,
  .section-header .section-title {
    color: var(--bs-gray-100);
  }

  // Keep sensor status card white even in dark mode
  .sensor-fault-section {
    .card,
    .card-body,
    .status-widget-content {
      background: var(--bs-white) !important;
    }

    .status-text .status-description {
      color: var(--bs-gray-600);
    }

    .status-details .detail-item {
      .detail-label {
        color: var(--bs-gray-600);
      }

      .detail-value {
        color: var(--bs-gray-900);
      }
    }
  }
}
</style>