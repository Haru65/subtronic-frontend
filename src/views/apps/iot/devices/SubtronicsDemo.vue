<template>
  <div class="subtronics-demo">
    <!-- Header -->
    <div class="demo-header">
      <div class="container-fluid">
        <div class="row align-items-center">
          <div class="col">
            <h1 class="page-title">
              <i class="bi bi-cloud me-2"></i>
              Subtronics Gas Monitor Demo
            </h1>
            <p class="page-description">
              Real-time gas detection monitoring with MQTT integration
            </p>
          </div>
          <div class="col-auto">
            <div class="demo-badges">
              <span class="badge bg-success me-2">
                <i class="bi bi-wifi me-1"></i>
                MQTT Connected
              </span>
              <span class="badge bg-info">
                <i class="bi bi-broadcast me-1"></i>
                SubTronics/data
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Demo Cards -->
    <div class="container-fluid">
      <div class="row g-4">
        <!-- Device List -->
        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="bi bi-list me-2"></i>
                Available Devices
              </h5>
            </div>
            <div class="card-body">
              <div class="device-list">
                <div 
                  v-for="device in demoDevices"
                  :key="device.id"
                  class="device-item"
                  @click="selectDevice(device.id)"
                  :class="{ active: selectedDevice === device.id }"
                >
                  <div class="device-icon">
                    <i :class="device.icon"></i>
                  </div>
                  <div class="device-info">
                    <div class="device-name">{{ device.name }}</div>
                    <div class="device-serial">{{ device.serial }}</div>
                    <div class="device-gas">{{ device.gasType }}</div>
                  </div>
                  <div class="device-status">
                    <span class="status-dot" :class="device.status"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- API Status -->
        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="bi bi-gear me-2"></i>
                API Status
              </h5>
            </div>
            <div class="card-body">
              <div class="api-status">
                <div class="status-item">
                  <div class="status-label">Backend API</div>
                  <div class="status-value">
                    <span class="badge" :class="backendStatus ? 'bg-success' : 'bg-danger'">
                      {{ backendStatus ? 'Connected' : 'Disconnected' }}
                    </span>
                  </div>
                </div>
                
                <div class="status-item">
                  <div class="status-label">MQTT Broker</div>
                  <div class="status-value">
                    <span class="badge" :class="mqttStatus ? 'bg-success' : 'bg-warning'">
                      {{ mqttStatus ? 'Connected' : 'Disconnected' }}
                    </span>
                  </div>
                </div>
                
                <div class="status-item">
                  <div class="status-label">Last Update</div>
                  <div class="status-value">{{ formatTime(lastUpdate) }}</div>
                </div>
                
                <div class="status-item">
                  <div class="status-label">Data Quality</div>
                  <div class="status-value">
                    <span class="badge bg-success">Good</span>
                  </div>
                </div>
              </div>
              
              <div class="mt-3">
                <button 
                  @click="testConnection"
                  :disabled="testing"
                  class="btn btn-primary btn-sm me-2"
                >
                  <i :class="testing ? 'bi bi-hourglass-split' : 'bi bi-arrow-clockwise'" class="me-1"></i>
                  {{ testing ? 'Testing...' : 'Test Connection' }}
                </button>
                
                <button 
                  @click="publishTestData"
                  :disabled="publishing"
                  class="btn btn-success btn-sm"
                >
                  <i :class="publishing ? 'bi bi-hourglass-split' : 'bi bi-broadcast'" class="me-1"></i>
                  {{ publishing ? 'Publishing...' : 'Publish Test Data' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="bi bi-lightning me-2"></i>
                Quick Actions
              </h5>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <router-link 
                  :to="`/subtronics/devices/${selectedDevice}`"
                  class="btn btn-primary"
                >
                  <i class="bi bi-eye me-2"></i>
                  View Device Details
                </router-link>
                
                <button 
                  @click="refreshData"
                  :disabled="refreshing"
                  class="btn btn-outline-primary"
                >
                  <i :class="refreshing ? 'bi bi-hourglass-split' : 'bi bi-arrow-clockwise'" class="me-2"></i>
                  {{ refreshing ? 'Refreshing...' : 'Refresh Data' }}
                </button>
                
                <button 
                  @click="viewRawData"
                  class="btn btn-outline-info"
                >
                  <i class="bi bi-code me-2"></i>
                  View Raw MQTT Data
                </button>
                
                <button 
                  @click="downloadLogs"
                  class="btn btn-outline-secondary"
                >
                  <i class="bi bi-download me-2"></i>
                  Download Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Raw Data Modal -->
      <div class="modal fade" id="rawDataModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Raw MQTT Data</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <pre class="raw-data-display">{{ JSON.stringify(rawData, null, 2) }}</pre>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" @click="copyRawData">
                <i class="bi bi-clipboard me-1"></i>
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Data Section -->
      <div class="row mt-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">
                <i class="bi bi-activity me-2"></i>
                Live Data Stream
                <span class="badge bg-success ms-2" v-if="isLive">LIVE</span>
              </h5>
            </div>
            <div class="card-body">
              <div class="live-data-container">
                <div 
                  v-for="(entry, index) in liveDataStream"
                  :key="index"
                  class="live-data-entry"
                  :class="{ 'new-entry': entry.isNew }"
                >
                  <div class="entry-timestamp">{{ formatTime(entry.timestamp) }}</div>
                  <div class="entry-device">{{ entry.deviceName }}</div>
                  <div class="entry-data">
                    <span class="data-label">Gas:</span>
                    <span class="data-value">{{ entry.gasConcentration }} {{ entry.unit }}</span>
                    <span class="data-label ms-3">Status:</span>
                    <span class="data-value" :class="getStatusClass(entry.alarmStatus)">
                      {{ getStatusText(entry.alarmStatus) }}
                    </span>
                  </div>
                </div>
                
                <div v-if="liveDataStream.length === 0" class="empty-stream">
                  <i class="bi bi-broadcast display-4 text-muted"></i>
                  <p class="mt-2 text-muted">Waiting for live data...</p>
                  <small class="text-muted">Data will appear here when received from MQTT topic: SubTronics/data</small>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { subtronicsService } from '@/services/subtronics.service';
import { formatTime } from '@/utils/dateFormatter';

// Reactive state
const selectedDevice = ref('OTSM-0114');
const backendStatus = ref(false);
const mqttStatus = ref(false);
const lastUpdate = ref(new Date().toISOString());
const testing = ref(false);
const publishing = ref(false);
const refreshing = ref(false);
const isLive = ref(false);
const rawData = ref({});
const liveDataStream = ref<any[]>([]);

// Demo devices
const demoDevices = ref([
  {
    id: 'OTSM-0114',
    name: 'Gas Sensor Block1',
    serial: 'OTSM-0114',
    gasType: 'Carbon Monoxide (CO)',
    icon: 'bi bi-cloud-fog',
    status: 'online'
  }
]);

// Methods
const selectDevice = (deviceId: string) => {
  selectedDevice.value = deviceId;
};

const testConnection = async () => {
  testing.value = true;
  try {
    const isConnected = await subtronicsService.testConnection();
    backendStatus.value = isConnected;
    
    if (isConnected) {
      // Test MQTT status by checking health endpoint
      const backendUrl = import.meta.env.VITE_SUBTRONICS_API_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/health`);
      const health = await response.json();
      mqttStatus.value = health.mqtt_connected;
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    backendStatus.value = false;
    mqttStatus.value = false;
  } finally {
    testing.value = false;
  }
};

const publishTestData = async () => {
  publishing.value = true;
  try {
    await subtronicsService.publishTestData(selectedDevice.value);
    
    // Refresh data to get the actual published data
    setTimeout(async () => {
      await refreshData();
    }, 2000);
  } catch (error) {
    console.error('Failed to publish test data:', error);
  } finally {
    publishing.value = false;
  }
};

const refreshData = async () => {
  refreshing.value = true;
  try {
    const data = await subtronicsService.getLatestTelemetry(selectedDevice.value);
    rawData.value = data;
    lastUpdate.value = new Date().toISOString();
    
    // Add to live stream
    addLiveDataEntry({
      deviceName: data.device_name,
      gasConcentration: data.sensor_reading,
      unit: data.unit,
      alarmStatus: data.alarm_status.toLowerCase()
    });
  } catch (error) {
    console.error('Failed to refresh data:', error);
  } finally {
    refreshing.value = false;
  }
};

const viewRawData = async () => {
  try {
    const data = await subtronicsService.getLatestTelemetry(selectedDevice.value);
    rawData.value = data;
    
    // Show modal (using Bootstrap modal)
    const modal = new (window as any).bootstrap.Modal(document.getElementById('rawDataModal'));
    modal.show();
  } catch (error) {
    console.error('Failed to fetch raw data:', error);
  }
};

const copyRawData = () => {
  navigator.clipboard.writeText(JSON.stringify(rawData.value, null, 2));
};

const downloadLogs = () => {
  const logs = {
    timestamp: new Date().toISOString(),
    device: selectedDevice.value,
    liveData: liveDataStream.value,
    rawData: rawData.value
  };
  
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subtronics-logs-${selectedDevice.value}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const addLiveDataEntry = (data: any) => {
  const entry = {
    ...data,
    timestamp: new Date().toISOString(),
    isNew: true
  };
  
  liveDataStream.value.unshift(entry);
  
  // Remove new flag after animation
  setTimeout(() => {
    entry.isNew = false;
  }, 1000);
  
  // Keep only last 20 entries
  if (liveDataStream.value.length > 20) {
    liveDataStream.value = liveDataStream.value.slice(0, 20);
  }
  
  isLive.value = true;
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'alarm': return 'text-danger';
    case 'warning': return 'text-warning';
    default: return 'text-success';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'alarm': return 'ALARM';
    case 'warning': return 'WARNING';
    default: return 'NORMAL';
  }
};

// Lifecycle
onMounted(() => {
  testConnection();
  refreshData();
});
</script>

<style scoped lang="scss">
.subtronics-demo {
  min-height: 100vh;
  background: var(--bs-gray-50);
}

.demo-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem 0;
  margin-bottom: 2rem;

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
  }

  .page-description {
    opacity: 0.9;
    margin: 0.5rem 0 0 0;
  }

  .demo-badges {
    .badge {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
    }
  }
}

.device-list {
  .device-item {
    display: flex;
    align-items: center;
    padding: 1rem;
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: var(--bs-gray-100);
      transform: translateY(-1px);
    }

    &.active {
      background: var(--bs-primary);
      color: white;
      border-color: var(--bs-primary);
    }

    .device-icon {
      width: 2.5rem;
      height: 2.5rem;
      background: var(--bs-gray-200);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      margin-right: 1rem;
    }

    .device-info {
      flex: 1;

      .device-name {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .device-serial {
        font-size: 0.875rem;
        opacity: 0.8;
      }

      .device-gas {
        font-size: 0.75rem;
        opacity: 0.7;
      }
    }

    .device-status {
      .status-dot {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 50%;
        display: inline-block;

        &.online {
          background: #28a745;
        }

        &.offline {
          background: #6c757d;
        }
      }
    }
  }
}

.api-status {
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
      font-weight: 500;
      color: var(--bs-gray-700);
    }

    .status-value {
      font-weight: 600;
    }
  }
}

.raw-data-display {
  background: var(--bs-gray-100);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
  font-size: 0.875rem;
}

.live-data-container {
  max-height: 400px;
  overflow-y: auto;

  .live-data-entry {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    margin-bottom: 0.5rem;
    transition: all 0.3s ease;

    &.new-entry {
      background: rgba(40, 167, 69, 0.1);
      border-color: #28a745;
      animation: pulse 1s ease-in-out;
    }

    .entry-timestamp {
      font-size: 0.75rem;
      color: var(--bs-gray-600);
      min-width: 120px;
    }

    .entry-device {
      font-weight: 600;
      min-width: 150px;
      margin-left: 1rem;
    }

    .entry-data {
      flex: 1;
      margin-left: 1rem;

      .data-label {
        font-size: 0.875rem;
        color: var(--bs-gray-600);
      }

      .data-value {
        font-weight: 600;
        margin-left: 0.25rem;
      }
    }
  }

  .empty-stream {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--bs-gray-600);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .subtronics-demo {
    background: var(--bs-gray-900);
  }

  .device-list .device-item {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-700);

    &:hover {
      background: var(--bs-gray-700);
    }

    .device-icon {
      background: var(--bs-gray-700);
    }
  }

  .raw-data-display {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-700);
    color: var(--bs-gray-100);
  }

  .live-data-container .live-data-entry {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-700);
  }
}
</style>