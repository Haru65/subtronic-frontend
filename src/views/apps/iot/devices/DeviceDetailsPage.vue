<template>
  <div>
    <!-- Back Button & Refresh Button -->
    <div class="mb-5 d-flex gap-3 align-items-center">
      <router-link to="/devices" class="btn btn-sm btn-light border">
        <i class="bi bi-arrow-left me-2"></i>
        Back to Devices
      </router-link>
      <button 
        @click="refreshDeviceSettings"
        :disabled="refreshing"
        class="btn btn-sm btn-primary"
        title="Refresh device control grid"
      >
        <i :class="refreshing ? 'bi bi-hourglass-split' : 'bi bi-arrow-clockwise'" class="me-2" :style="refreshing ? 'animation: spin 1s linear infinite' : ''"></i>
        {{ refreshing ? 'Refreshing...' : 'Refresh' }}
      </button>
      <small class="text-muted d-none d-sm-inline">Click to refresh device data and settings</small>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card">
      <div class="card-body text-center py-10">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Loading device details...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger">
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error }}
    </div>

    <!-- Device Details -->
    <div v-else-if="device">
      <!-- Header Card -->
      <div class="card mb-5">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
              <div class="symbol symbol-65px me-5">
                <span class="symbol-label bg-light-primary">
                  <i :class="device.metadata?.icon || 'bi bi-cpu'" class="fs-2x text-primary"></i>
                </span>
              </div>
              <div>
                <h1 class="fw-bold text-dark mb-2">{{ device.name }}</h1>
                <div class="text-muted fs-6">
                  <i class="bi bi-geo-alt me-1"></i>
                  {{ device.location }}
                </div>
                <div class="text-muted fs-7 mt-1">
                  Device ID: <span class="badge badge-light-info">{{ device.deviceId }}</span>
                </div>
              </div>
            </div>
            <div class="text-end">
              <span class="badge badge-lg" :class="getStatusClass(device.status)">
                {{ device.status }}
              </span>
              <div class="mt-2">
                <span
                  class="badge"
                  :class="mqttConnected ? 'badge-light-success' : 'badge-light-danger'"
                >
                  <i class="bi bi-circle-fill me-1" style="font-size: 8px"></i>
                  {{ mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-5">
        <!-- Left Column: Real-time Metrics -->
        <div class="col-lg-6">
          <!-- Real-time Metrics Card -->
          <div class="card mb-5">
            <div class="card-header">
              <h3 class="card-title">Real-time Metrics</h3>
              <div class="card-toolbar">
                <span class="badge badge-light-primary">Live</span>
              </div>
            </div>
            <div class="card-body">
              <div v-if="!currentMetrics || Object.values(currentMetrics).every(v => v === null)" class="text-center text-muted py-5">
                <i class="bi bi-graph-up fs-2x"></i>
                <p class="mt-2">No real-time metrics available</p>
              </div>
              <div v-else class="row g-4">
                <!-- Battery -->
                <div v-if="currentMetrics.battery !== null && currentMetrics.battery !== undefined" class="col-6">
                  <div class="card bg-light-success border-0">
                    <div class="card-body text-center">
                      <i class="bi bi-battery-charging fs-2x text-success mb-2"></i>
                      <h2 class="fw-bold mb-1">{{ currentMetrics.battery }}%</h2>
                      <p class="text-muted mb-0">Battery</p>
                      <small v-if="trends.battery" :class="trends.battery > 0 ? 'text-success' : 'text-danger'">
                        <i :class="trends.battery > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                        {{ Math.abs(trends.battery).toFixed(1) }}%
                      </small>
                    </div>
                  </div>
                </div>
                <!-- Signal -->
                <div v-if="currentMetrics.signal !== null && currentMetrics.signal !== undefined" class="col-6">
                  <div class="card bg-light-primary border-0">
                    <div class="card-body text-center">
                      <i class="bi bi-wifi fs-2x text-primary mb-2"></i>
                      <h2 class="fw-bold mb-1">{{ currentMetrics.signal }}%</h2>
                      <p class="text-muted mb-0">Signal</p>
                      <small v-if="trends.signal" :class="trends.signal > 0 ? 'text-success' : 'text-danger'">
                        <i :class="trends.signal > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                        {{ Math.abs(trends.signal).toFixed(1) }}%
                      </small>
                    </div>
                  </div>
                </div>
                <!-- Temperature -->
                <div v-if="currentMetrics.temperature !== null && currentMetrics.temperature !== undefined" class="col-6">
                  <div class="card bg-light-danger border-0">
                    <div class="card-body text-center">
                      <i class="bi bi-thermometer-half fs-2x text-danger mb-2"></i>
                      <h2 class="fw-bold mb-1">{{ currentMetrics.temperature }}°C</h2>
                      <p class="text-muted mb-0">Temperature</p>
                      <small v-if="trends.temperature" :class="trends.temperature > 0 ? 'text-danger' : 'text-success'">
                        <i :class="trends.temperature > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                        {{ Math.abs(trends.temperature).toFixed(1) }}°C
                      </small>
                    </div>
                  </div>
                </div>
                <!-- Humidity -->
                <div v-if="currentMetrics.humidity !== null && currentMetrics.humidity !== undefined" class="col-6">
                  <div class="card bg-light-info border-0">
                    <div class="card-body text-center">
                      <i class="bi bi-droplet fs-2x text-info mb-2"></i>
                      <h2 class="fw-bold mb-1">{{ currentMetrics.humidity }}%</h2>
                      <p class="text-muted mb-0">Humidity</p>
                      <small v-if="trends.humidity" :class="trends.humidity > 0 ? 'text-primary' : 'text-muted'">
                        <i :class="trends.humidity > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                        {{ Math.abs(trends.humidity).toFixed(1) }}%
                      </small>
                    </div>
                  </div>
                </div>
                <!-- Pressure -->
                <div v-if="currentMetrics.pressure !== null && currentMetrics.pressure !== undefined" class="col-6">
                  <div class="card bg-light-warning border-0">
                    <div class="card-body text-center">
                      <i class="bi bi-speedometer2 fs-2x text-warning mb-2"></i>
                      <h2 class="fw-bold mb-1">{{ currentMetrics.pressure }}</h2>
                      <p class="text-muted mb-0">Pressure</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Digital I/O Card -->
          <div class="card mb-5">
            <div class="card-header">
              <h3 class="card-title">Digital Input/Output</h3>
              <div class="card-toolbar">
                <span class="badge badge-light-secondary">Device States</span>
              </div>
            </div>
            <div class="card-body">
              <div v-if="digitalIOMetrics.length === 0" class="text-center text-muted py-5">
                <i class="bi bi-toggles fs-2x"></i>
                <p class="mt-2">No digital I/O data available</p>
              </div>
              <div v-else>
                <!-- Digital Inputs Section -->
                <div v-if="digitalInputs.length > 0" class="mb-4">
                  <h6 class="mb-3 text-uppercase text-muted fw-bold">
                    <i class="bi bi-arrow-left-square me-2"></i>Digital Inputs
                  </h6>
                  <div class="row g-3">
                    <div v-for="metric in digitalInputs" :key="metric.type" class="col-md-6">
                      <div class="card bg-light-info border-0">
                        <div class="card-body text-center">
                          <i class="bi bi-toggles fs-2x text-info mb-2"></i>
                          <h5 class="card-title fw-bold mb-1">{{ metric.type }}</h5>
                          <p class="text-muted mb-0">
                            <span 
                              :class="getDigitalIOClass(metric.value)"
                              class="fs-6"
                            >
                              {{ metric.value !== null && metric.value !== undefined ? metric.value : 'N/A' }}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Digital Outputs Section -->
                <div v-if="digitalOutputs.length > 0">
                  <h6 class="mb-3 text-uppercase text-muted fw-bold">
                    <i class="bi bi-arrow-right-square me-2"></i>Digital Outputs
                  </h6>
                  <div class="row g-3">
                    <div v-for="metric in digitalOutputs" :key="metric.type" class="col-md-6">
                      <div class="card bg-light-warning border-0">
                        <div class="card-body text-center">
                          <i class="bi bi-arrow-right-square fs-2x text-warning mb-2"></i>
                          <h5 class="card-title fw-bold mb-1">{{ metric.type }}</h5>
                          <p class="text-muted mb-0">
                            <span 
                              :class="getDigitalIOClass(metric.value)"
                              class="fs-6"
                            >
                              {{ metric.value !== null && metric.value !== undefined ? metric.value : 'N/A' }}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- MQTT Configuration Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">MQTT Configuration</h3>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label text-muted">Broker URL</label>
                <div class="fw-bold">{{ device.mqttConfig?.brokerUrl || 'Not configured' }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted">Topic Prefix</label>
                <div class="fw-bold">{{ device.mqttConfig?.topicPrefix || 'N/A' }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted">Data Topic</label>
                <div class="fw-bold">{{ device.mqttConfig?.topics?.data || 'N/A' }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label text-muted">Status Topic</label>
                <div class="fw-bold">{{ device.mqttConfig?.topics?.status || 'N/A' }}</div>
              </div>
              <div>
                <label class="form-label text-muted">Control Topic</label>
                <div class="fw-bold">{{ device.mqttConfig?.topics?.control || 'N/A' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Historical Data & Messages -->
        <div class="col-lg-6">
          <!-- Live Messages Card -->
          <div class="card mb-5">
            <div class="card-header">
              <h3 class="card-title">Live Message Stream</h3>
              <div class="card-toolbar">
                <span class="badge badge-light">{{ mqttMessages.length }} messages</span>
              </div>
            </div>
            <div class="card-body" style="max-height: 400px; overflow-y: auto">
              <div v-if="mqttMessages.length === 0" class="text-center text-muted py-5">
                <i class="bi bi-inbox fs-2x"></i>
                <p class="mt-2">No messages yet</p>
              </div>
              <div v-else>
                <div
                  v-for="(msg, index) in mqttMessages"
                  :key="index"
                  class="p-3 mb-2 bg-light rounded"
                >
                  <div class="d-flex justify-content-between align-items-start mb-1">
                    <small class="text-muted">{{ msg.topic }}</small>
                    <small class="text-muted">{{ formatTime(msg.timestamp) }}</small>
                  </div>
                  <pre class="mb-0 text-dark" style="font-size: 12px; white-space: pre-wrap">{{ formatMessage(msg.payload) }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Historical Data Table -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Historical Data (24h)</h3>
              <div class="card-toolbar">
                <span class="badge badge-light-info">{{ historicalData.length }} records</span>
              </div>
            </div>
            <div class="card-body" style="max-height: 400px; overflow-y: auto">
              <div v-if="historicalData.length === 0" class="text-center text-muted py-5">
                <i class="bi bi-bar-chart fs-2x"></i>
                <p class="mt-2">No historical data available</p>
              </div>
              <table v-else class="table table-sm table-row-bordered">
                <thead>
                  <tr class="fw-bold text-muted bg-light">
                    <th>Time</th>
                    <th>Battery</th>
                    <th>Signal</th>
                    <th>Temp</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(record, index) in historicalData.slice(0, 50)" :key="index">
                    <td class="text-muted">{{ formatHistoricalTime(record.timestamp) }}</td>
                    <td>{{ record.data?.battery || '-' }}</td>
                    <td>{{ record.data?.signal || '-' }}</td>
                    <td>{{ record.data?.temperature || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import ApiService from '@/core/services/ApiService';
import { useMqttClient } from '@/composables/useMqttClient';
import { formatTime } from '@/utils/dateFormatter';

interface MqttMessage {
  topic: string;
  payload: any;
  timestamp: Date;
}

export default defineComponent({
  name: 'DeviceDetailsPage',
  setup() {
    const route = useRoute();
    const deviceId = ref<string>(route.params.id as string);
    const device = ref<any>(null);
    const historicalData = ref<any[]>([]);
    const loading = ref<boolean>(true);
    const error = ref<string | null>(null);
    const refreshing = ref<boolean>(false);
    
    // MQTT composable (will be initialized after fetching device details)
    let mqttComposable: ReturnType<typeof useMqttClient> | null = null;
    const mqttConnected = ref<boolean>(false);
    const mqttMessages = ref<MqttMessage[]>([]);
    const currentMetrics = ref<any>({});
    const previousMetrics = ref<any>({});

    // Computed trends
    const trends = computed(() => {
      const t: any = {};
      if (previousMetrics.value.battery && currentMetrics.value.battery) {
        t.battery = currentMetrics.value.battery - previousMetrics.value.battery;
      }
      if (previousMetrics.value.signal && currentMetrics.value.signal) {
        t.signal = currentMetrics.value.signal - previousMetrics.value.signal;
      }
      if (previousMetrics.value.temperature && currentMetrics.value.temperature) {
        t.temperature = currentMetrics.value.temperature - previousMetrics.value.temperature;
      }
      if (previousMetrics.value.humidity && currentMetrics.value.humidity) {
        t.humidity = currentMetrics.value.humidity - previousMetrics.value.humidity;
      }
      return t;
    });

    // Computed digital I/O metrics
    const digitalIOMetrics = computed(() => {
      if (!currentMetrics.value) return [];
      const metrics: any[] = [];
      
      // Collect all digital input and output metrics
      const diKeys = ['DI1', 'DI2', 'DI3', 'DI4'];
      const doKeys = ['DO1', 'DO2', 'DO3', 'DO4'];
      
      diKeys.forEach(key => {
        if (currentMetrics.value[key] !== undefined) {
          metrics.push({
            type: key,
            value: currentMetrics.value[key],
            category: 'Digital Input'
          });
        }
      });
      
      doKeys.forEach(key => {
        if (currentMetrics.value[key] !== undefined) {
          metrics.push({
            type: key,
            value: currentMetrics.value[key],
            category: 'Digital Output'
          });
        }
      });
      
      return metrics;
    });

    const digitalInputs = computed(() => {
      return digitalIOMetrics.value.filter(m => m.category === 'Digital Input');
    });

    const digitalOutputs = computed(() => {
      return digitalIOMetrics.value.filter(m => m.category === 'Digital Output');
    });

    // Fetch device details
    const fetchDeviceDetails = async () => {
      try {
        loading.value = true;
        error.value = null;
        ApiService.setHeader();
        
        const response = await ApiService.get('/api/devices', deviceId.value);
        
        if (response.data && response.data.success) {
          device.value = response.data.device;
          historicalData.value = response.data.historicalData?.data || [];
          
          // Extract current metrics from device.currentData with safe defaults
          const sensorData = device.value.currentData || {};
          currentMetrics.value = {
            battery: sensorData.battery !== undefined ? sensorData.battery : null,
            signal: sensorData.signal !== undefined ? sensorData.signal : null,
            temperature: sensorData.temperature !== undefined ? sensorData.temperature : null,
            humidity: sensorData.humidity !== undefined ? sensorData.humidity : null,
            pressure: sensorData.pressure !== undefined ? sensorData.pressure : null,
            // Initialize digital I/O metrics from sensorData
            DI1: sensorData.DI1 !== undefined ? sensorData.DI1 : null,
            DI2: sensorData.DI2 !== undefined ? sensorData.DI2 : null,
            DI3: sensorData.DI3 !== undefined ? sensorData.DI3 : null,
            DI4: sensorData.DI4 !== undefined ? sensorData.DI4 : null,
            DO1: sensorData.DO1 !== undefined ? sensorData.DO1 : null,
            DO2: sensorData.DO2 !== undefined ? sensorData.DO2 : null,
            DO3: sensorData.DO3 !== undefined ? sensorData.DO3 : null,
            DO4: sensorData.DO4 !== undefined ? sensorData.DO4 : null
          };
          
          console.log('📊 Device metrics initialized:', currentMetrics.value);
          
          // Initialize MQTT connection
          if (device.value.mqttConfig?.brokerUrl && device.value.mqttConfig?.topics?.data) {
            connectToMqtt();
          }
        } else {
          throw new Error('Failed to fetch device details');
        }
      } catch (err: any) {
        console.error('Error fetching device details:', err);
        error.value = err.response?.data?.message || err.message || 'Failed to load device details';
      } finally {
        loading.value = false;
      }
    };

    // Refresh device settings without losing session
    const refreshDeviceSettings = async () => {
      try {
        refreshing.value = true;
        error.value = null;
        
        // Ensure token is set before making the API call
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No authentication token found. Please login again.');
        }
        
        // Use axios directly with the token in the header
        const axiosInstance = (ApiService.vueInstance?.axios || (window as any).axios);
        if (!axiosInstance) {
          throw new Error('API service not initialized');
        }
        
        const response = await axiosInstance.get(
          `${import.meta.env.VITE_APP_API_URL || 'http://localhost:3001'}/api/devices/${deviceId.value}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          }
        );
        
        if (response.data && response.data.success) {
          device.value = response.data.device;
          historicalData.value = response.data.historicalData?.data || [];
          
          // Extract current metrics from device.currentData with safe defaults
          const sensorData = device.value.currentData || {};
          currentMetrics.value = {
            battery: sensorData.battery !== undefined ? sensorData.battery : currentMetrics.value.battery,
            signal: sensorData.signal !== undefined ? sensorData.signal : currentMetrics.value.signal,
            temperature: sensorData.temperature !== undefined ? sensorData.temperature : currentMetrics.value.temperature,
            humidity: sensorData.humidity !== undefined ? sensorData.humidity : currentMetrics.value.humidity,
            pressure: sensorData.pressure !== undefined ? sensorData.pressure : currentMetrics.value.pressure,
            // Update digital I/O metrics
            DI1: sensorData.DI1 !== undefined ? sensorData.DI1 : currentMetrics.value.DI1,
            DI2: sensorData.DI2 !== undefined ? sensorData.DI2 : currentMetrics.value.DI2,
            DI3: sensorData.DI3 !== undefined ? sensorData.DI3 : currentMetrics.value.DI3,
            DI4: sensorData.DI4 !== undefined ? sensorData.DI4 : currentMetrics.value.DI4,
            DO1: sensorData.DO1 !== undefined ? sensorData.DO1 : currentMetrics.value.DO1,
            DO2: sensorData.DO2 !== undefined ? sensorData.DO2 : currentMetrics.value.DO2,
            DO3: sensorData.DO3 !== undefined ? sensorData.DO3 : currentMetrics.value.DO3,
            DO4: sensorData.DO4 !== undefined ? sensorData.DO4 : currentMetrics.value.DO4
          };
          
          console.log('✅ Device settings refreshed successfully');
          
          // Show success notification using Swal (SweetAlert2)
          const Swal = (window as any).Swal;
          if (Swal) {
            Swal.fire({
              icon: 'success',
              title: 'Refreshed!',
              text: 'Device settings updated successfully',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2000
            });
          }
        } else {
          throw new Error('Failed to refresh device settings');
        }
      } catch (err: any) {
        console.error('Error refreshing device settings:', err);
        
        // Check if it's an auth error
        if (err.response?.status === 401) {
          error.value = 'Your session has expired. Please refresh the page and login again.';
          console.warn('⚠️ Authentication token expired');
        } else {
          error.value = err.response?.data?.message || err.message || 'Failed to refresh device settings';
        }
        
        // Show error notification using Swal (SweetAlert2)
        const Swal = (window as any).Swal;
        if (Swal) {
          Swal.fire({
            icon: 'error',
            title: 'Refresh Failed',
            text: error.value,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      } finally {
        refreshing.value = false;
      }
    };

    // Connect to MQTT broker
    const connectToMqtt = () => {
      if (!device.value?.mqttConfig?.brokerUrl || !device.value?.mqttConfig?.topics?.data) {
        console.warn('MQTT configuration not available');
        return;
      }

      const brokerUrl = device.value.mqttConfig.brokerUrl;
      const topic = device.value.mqttConfig.topics.data;

      // Initialize MQTT composable with events
      mqttComposable = useMqttClient(brokerUrl, topic, deviceId.value);

      mqttComposable.connect({
        onConnect: () => {
          mqttConnected.value = true;
          console.log('MQTT Connected via composable');
        },
        onMessage: async (message) => {
          try {
            const payload = message.payload;
            
            // Add to message stream (keep last 20)
            mqttMessages.value.unshift({
              topic: message.topic,
              payload,
              timestamp: new Date()
            });
            if (mqttMessages.value.length > 20) {
              mqttMessages.value.pop();
            }

            // Update current metrics and calculate trends
            if (payload && typeof payload === 'object') {
              previousMetrics.value = { ...currentMetrics.value };
              currentMetrics.value = {
                battery: payload.battery !== undefined ? payload.battery : currentMetrics.value.battery,
                signal: payload.signal !== undefined ? payload.signal : currentMetrics.value.signal,
                temperature: payload.temperature !== undefined ? payload.temperature : currentMetrics.value.temperature,
                humidity: payload.humidity !== undefined ? payload.humidity : currentMetrics.value.humidity,
                pressure: payload.pressure !== undefined ? payload.pressure : currentMetrics.value.pressure,
                // Digital Inputs
                DI1: payload.DI1 !== undefined ? payload.DI1 : currentMetrics.value.DI1,
                DI2: payload.DI2 !== undefined ? payload.DI2 : currentMetrics.value.DI2,
                DI3: payload.DI3 !== undefined ? payload.DI3 : currentMetrics.value.DI3,
                DI4: payload.DI4 !== undefined ? payload.DI4 : currentMetrics.value.DI4,
                // Digital Outputs
                DO1: payload.DO1 !== undefined ? payload.DO1 : currentMetrics.value.DO1,
                DO2: payload.DO2 !== undefined ? payload.DO2 : currentMetrics.value.DO2,
                DO3: payload.DO3 !== undefined ? payload.DO3 : currentMetrics.value.DO3,
                DO4: payload.DO4 !== undefined ? payload.DO4 : currentMetrics.value.DO4
              };

              // Send data to backend API for storage
              try {
                ApiService.setHeader();
                await ApiService.post(`/api/devices/${deviceId.value}/data`, payload);
              } catch (apiErr) {
                console.error('Error sending data to backend:', apiErr);
              }
            }
          } catch (err) {
            console.error('Error processing MQTT message:', err);
          }
        },
        onError: (err) => {
          console.error('MQTT Error:', err);
          mqttConnected.value = false;
        },
        onDisconnect: () => {
          mqttConnected.value = false;
          console.log('MQTT Disconnected');
        },
        onReconnect: () => {
          console.log('MQTT Reconnecting...');
        }
      });
    };

    onMounted(() => {
      fetchDeviceDetails();
    });

    // Cleanup is automatic via useMqttClient composable's onUnmounted hook

    // Format time
    const formatTime = (timestamp: Date) => {
    const formatTime = (timestamp: Date) => {
      return new Date(timestamp).toLocaleTimeString();
    };

    // Format historical time
    const formatHistoricalTime = (timestamp: string) => {
      const date = new Date(timestamp);
      return date.toLocaleString();
    };

    // Format message payload
    const formatMessage = (payload: any) => {
      return typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    };

    // Get status badge class
    const getStatusClass = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'online':
          return 'badge-light-success';
        case 'offline':
          return 'badge-light-danger';
        case 'warning':
          return 'badge-light-warning';
        default:
          return 'badge-light-secondary';
      }
    };

    // Get digital I/O value class
    const getDigitalIOClass = (value: string) => {
      if (value === 'CLOSE') {
        return 'badge bg-success';
      } else if (value === 'OPEN') {
        return 'badge bg-danger';
      }
      return 'badge bg-secondary';
    };

    // Get digital I/O value color
    const getDigitalIOColor = (value: string) => {
      if (value === 'CLOSE') {
        return '#198754'; // Green
      } else if (value === 'OPEN') {
        return '#dc3545'; // Red
      }
      return '#6c757d'; // Gray
    };

    onMounted(() => {
      fetchDeviceDetails();
    });

    return {
      device,
      historicalData,
      loading,
      error,
      refreshing,
      mqttConnected,
      mqttMessages,
      currentMetrics,
      trends,
      digitalIOMetrics,
      digitalInputs,
      digitalOutputs,
      formatTime,
      formatHistoricalTime,
      formatMessage,
      getStatusClass,
      getDigitalIOClass,
      getDigitalIOColor,
      refreshDeviceSettings
    };
  }
});
</script>

<style scoped>
.card {
  box-shadow: 0 0.5rem 1.5rem 0.5rem rgba(0, 0, 0, 0.075);
}

pre {
  margin: 0;
  font-family: 'Courier New', monospace;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
