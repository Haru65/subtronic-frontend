<script lang="ts">
import { defineComponent, ref, onMounted, computed, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import ApiService from '@/core/services/ApiService';
import { reverseGeocode } from '@/utils/reverseGeocode';
import { io, Socket } from 'socket.io-client';
import { mqttService, type InterruptModeConfig } from '@/services/mqtt.service';
import { useDeviceSettingsCaching } from '@/composables/useDeviceSettingsCaching';
import Swal from 'sweetalert2';

const FAILOVER_TIMEOUT_MS = 10_000; // 10 seconds timeout for main device

// Value mappings for device settings
const ELECTRODE_MAPPING: Record<string, number> = {
  'Cu/CuSO4': 0,
  'Cu/cuso4': 0,
  'CuCuSO4': 0,
  'Zinc': 1,
  'Ag/AgCl': 2,
  'AgAgSO4': 2
};

const MODE_MAPPING: Record<string, number> = {
  'Normal': 0,
  'Interrupt': 1,
  'Manual': 2,
  'DPOL': 3,
  'INST': 4
};

const MANUAL_ACTION_MAPPING: Record<string, number> = {
  'stop': 0,
  'start': 1
};

const INSTANT_MODE_MAPPING: Record<string, number> = {
  'daily': 0,
  'weekly': 1
};

export default defineComponent({
  setup() {
    const mainDevice = ref<any>(null);
    const simDevice = ref<any>(null);
  const deviceSettings = ref<any>(null);
  const deviceId = ref<string | null>(null);
    const lastMainUpdate = ref<number>(0);
    const now = ref(Date.now());
    const socket = ref<Socket | null>(null);
    const connectionStatus = ref<string>('disconnected');
    let lastConnectionStatusUpdate = 0;
    const connectionStatusDebounceTime = 2000; // 2 seconds
    let lastPingTime = 0;
    let pingTimeoutId: NodeJS.Timeout | null = null;
    const pingInterval = 2 * 60 * 1000; // 2 minutes
    const pingTimeout = 10000; // 10 seconds to wait for pong
    let pingCheckInterval: NodeJS.Timeout | null = null;
    const updateInterval = ref<NodeJS.Timeout | null>(null);
    
    // Settings caching system
    let settingsCache: any = null;
    const pendingChangesCount = ref<number>(0);
    const showPendingChanges = ref<boolean>(false);
    const pendingChangesList = ref<Record<string, any>>({});
    
    /**
     * ✅ Data Transformation Helper
     * Converts UI values to device payload format before staging
     * Handles all mappings, padding, conversions
     */
    const dataTransformer = {
      // Electrode configuration
      electrodeToPayload: (electrodeType: string) => {
        const electrodeCode = ELECTRODE_MAPPING[electrodeType] || 0;
        const defaultRefFail = electrodeType === 'Zinc' ? -0.80 : 0.30;
        return {
          electrode: electrodeCode,
          referenceFail: defaultRefFail,
          ElectrodeType: electrodeType
        };
      },
      
      // Logging interval configuration
      loggingIntervalToPayload: (timeStr: string) => {
        return {
          logging_interval: timeStr  // Send formatted time string as backend expects
        };
      },
      
      // Shunt voltage configuration
      shuntVoltageToPayload: (voltage: string) => {
        return {
          shuntVoltage: String(voltage).padStart(3, '0')
        };
      },
      
      // Shunt current configuration
      shuntCurrentToPayload: (current: string) => {
        const currentNum = parseFloat(current);
        return {
          shuntCurrent: currentNum.toFixed(1).padStart(4, '0')
        };
      },
      
      // Alarm configuration
      alarmToPayload: (setupValue: number, setopValue: number, reffcalValue: number) => {
        return {
          'Set UP': setupValue,
          'Reference UP': setupValue,
          'Set OP': setopValue,
          'Reference OP': setopValue,
          'Reference Fail': reffcalValue
        };
      },
      
      // Normal mode
      normalModeToPayload: () => {
        return {
          event: 0,
          Mode: 'Normal'
        };
      },
      
      // Interrupt mode
      interruptModeToPayload: (startDate: string, startTime: string, stopDate: string, stopTime: string, onTime: number, offTime: number) => {
        return {
          event: 1,
          Mode: 'Interrupt',
          'Interrupt Start TimeStamp': `${startDate} ${startTime}`,
          'Interrupt Stop TimeStamp': `${stopDate} ${stopTime}`,
          'Interrupt ON Time': onTime,
          'Interrupt OFF Time': offTime
        };
      },
      
      // DPOL mode
      dpolModeToPayload: (startDate: string, startTime: string, endDate: string, endTime: string, interval: number) => {
        return {
          event: 3,
          Mode: 'DPOL',
          'DPOL Start TimeStamp': `${startDate} ${startTime}`,
          'DPOL End TimeStamp': `${endDate} ${endTime}`,
          'DPOL Interval': interval
        };
      },
      
      // INST mode
      instModeToPayload: (startTime: string, frequency: string) => {
        const frequencyCode = INSTANT_MODE_MAPPING[frequency] || 0;
        return {
          event: 4,
          Mode: 'INST',
          'INST Start TimeStamp': startTime,
          'INST Frequency': frequencyCode
        };
      }
    };
    
    // Function to initialize cache with current settings
    const initializeSettingsCache = () => {
      if (!deviceId.value) return;
      
      if (deviceSettings.value?.Parameters) {
        // Clear old cache and start fresh
        settingsCache = useDeviceSettingsCaching(deviceId.value);
        // initializeSettings in the composable will filter out old keys
        settingsCache.initializeSettings(deviceSettings.value.Parameters);
        console.log('📦 [CACHE] Settings cache initialized for device', deviceId.value);
        // Reset pending changes display
        pendingChangesCount.value = 0;
        pendingChangesList.value = {};
      }
    };
    
    // Helper to get or create cache for current device
    const getSettingsCache = () => {
      if (!deviceId.value) {
        console.warn('⚠️ Device ID not available for caching');
        return null;
      }
      if (!settingsCache) {
        initializeSettingsCache();
      }
      return settingsCache;
    };
    
    // Function to stage a setting update in cache
    const stageSettingUpdate = (key: string, value: any) => {
      if (!settingsCache) {
        console.warn('⚠️ Cache not initialized, initializing now...');
        initializeSettingsCache();
      }
      
      if (settingsCache) {
        settingsCache.stageUpdate(key, value);
        updatePendingChangesDisplay();
        console.log(`📝 [CACHE] Staged update: ${key} = ${value}`);
      }
    };
    
    // Update pending changes counter and list
    const updatePendingChangesDisplay = () => {
      if (settingsCache) {
        const summary = settingsCache.getStagedSummary();
        pendingChangesCount.value = summary.count;
        pendingChangesList.value = summary.changes;
        console.log(`📊 [CACHE] Pending changes: ${summary.count}`, summary.changes);
      }
    };
    
    // Apply all staged changes to device
    const applyAllSettings = async () => {
      if (!settingsCache || pendingChangesCount.value === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Changes',
          text: 'There are no pending changes to apply',
          timer: 1500,
          showConfirmButton: false
        });
        return;
      }

      try {
        const summary = settingsCache.getStagedSummary();
        const confirmed = await Swal.fire({
          icon: 'warning',
          title: 'Apply All Changes?',
          html: `
            <div class="text-start">
              <p>You are about to send <strong>${summary.count}</strong> setting change(s) to the device:</p>
              <div class="bg-light p-3 rounded mt-2" style="max-height: 200px; overflow-y: auto;">
                ${Object.entries(summary.changes).map(([key, value]) => `
                  <div class="mb-2">
                    <small><strong>${key}:</strong> ${JSON.stringify(value)}</small>
                  </div>
                `).join('')}
              </div>
              <p class="mt-3 mb-0"><small class="text-muted">All settings will be sent together as one complete payload.</small></p>
            </div>
          `,
          confirmButtonText: 'Apply Changes',
          cancelButtonText: 'Cancel',
          showCancelButton: true,
          confirmButtonColor: '#28a745'
        });

        if (confirmed.isConfirmed) {
          Swal.fire({
            title: 'Applying Settings',
            html: 'Sending all changes to device...',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          const result = await settingsCache.sendStagedChanges();
          
          if (result) {
            console.log('✅ All settings applied successfully');
            // CRITICAL: Update display to reflect cleared staged changes
            updatePendingChangesDisplay();
            
            // Clear the hash cache so watcher will definitely process the new settings
            lastProcessedSettings = null;
            
            await refreshDeviceSettings();
            
            // CRITICAL FIX: Refresh all modal forms after settings are applied
            // This ensures updated values are shown immediately in the UI
            await nextTick();
            if (showDpolModal.value) {
              populateDpolFormFromSettings();
              console.log('🔄 [DPOL] Form refreshed after settings applied');
            }
            if (showAutoModal.value) {
              populateAutoFormFromSettings();
              console.log('🔄 [AUTO] Form refreshed after settings applied');
            }
            if (showManualModal.value) {
              populateAutoFormFromSettings();
              console.log('🔄 [MANUAL] Form refreshed after settings applied');
            }
            if (showInstModal.value) {
              populateInstFormFromSettings();
              console.log('🔄 [INST] Form refreshed after settings applied');
            }
            
            Swal.fire({
              icon: 'success',
              title: 'Settings Applied!',
              text: `${summary.count} setting(s) have been sent to the device successfully.`,
              timer: 2000,
              showConfirmButton: false
            });
          }
        }
      } catch (error: any) {
        console.error('❌ Error applying settings:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to apply settings'
        });
      }
    };

    // Cancel all staged changes
    const cancelAllSettings = async () => {
      if (!settingsCache || pendingChangesCount.value === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Changes',
          text: 'There are no pending changes to cancel',
          timer: 1500,
          showConfirmButton: false
        });
        return;
      }

      try {
        const summary = settingsCache.getStagedSummary();
        const confirmed = await Swal.fire({
          icon: 'question',
          title: 'Cancel All Changes?',
          html: `
            <div class="text-start">
              <p>You are about to cancel <strong>${summary.count}</strong> pending change(s):</p>
              <div class="bg-light p-3 rounded mt-2" style="max-height: 200px; overflow-y: auto;">
                ${Object.entries(summary.changes).map(([key, value]) => `
                  <div class="mb-2">
                    <small><strong>${key}:</strong> ${JSON.stringify(value)}</small>
                  </div>
                `).join('')}
              </div>
              <p class="mt-3 mb-0"><small class="text-muted">These changes will be discarded and not sent to the device.</small></p>
            </div>
          `,
          confirmButtonText: 'Cancel Changes',
          cancelButtonText: 'Keep Changes',
          showCancelButton: true,
          confirmButtonColor: '#dc3545'
        });

        if (confirmed.isConfirmed) {
          // Discard the staged changes
          await settingsCache.discardChanges();
          
          // Update the display
          updatePendingChangesDisplay();
          
          console.log('✅ All pending changes have been cancelled');
        }
      } catch (error: any) {
        console.error('❌ Error cancelling settings:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to cancel changes'
        });
      }
    };
    
    // Function to refresh device settings from backend
    const refreshDeviceSettings = async () => {
      if (!deviceId.value) return;
      
      try {
        ApiService.setHeader();
        const settingsResponse = await ApiService.query(`/api/device-management/${deviceId.value}/settings`, {});
        console.log('🔄 [API POLL] Refreshed device settings from API:', settingsResponse);
        // The response is { success: true, data: {...} }, so we need .data.data
        const newSettings = settingsResponse.data?.data || null;
        
        // Log DPOL-specific values from API response
        if (newSettings?.Parameters) {
          console.log('📋 [API POLL] DPOL values from API:', {
            'Depolarization Start TimeStamp': newSettings.Parameters['Depolarization Start TimeStamp'],
            'Depolarization Stop TimeStamp': newSettings.Parameters['Depolarization Stop TimeStamp'],
            'Depolarization_interval': newSettings.Parameters['Depolarization_interval']
          });

          // Log Interrupt-specific values from API response
          console.log('📋 [API POLL] Interrupt values from API:', {
            'Interrupt Start TimeStamp': newSettings.Parameters['Interrupt Start TimeStamp'],
            'Interrupt Stop TimeStamp': newSettings.Parameters['Interrupt Stop TimeStamp'],
            'Interrupt ON Time': newSettings.Parameters['Interrupt ON Time'],
            'Interrupt OFF Time': newSettings.Parameters['Interrupt OFF Time']
          });

          // Log INST-specific values from API response
          console.log('📋 [API POLL] INST values from API:', {
            'Instant Start TimeStamp': newSettings.Parameters['Instant Start TimeStamp'],
            'Instant End TimeStamp': newSettings.Parameters['Instant End TimeStamp'],
            'Instant Mode': newSettings.Parameters['Instant Mode']
          });
        }
        
        console.log('💾 [API POLL] Storing deviceSettings:', newSettings);
        deviceSettings.value = newSettings;
        
        // Re-initialize cache with fresh settings
        if (deviceId.value && newSettings?.Parameters) {
          initializeSettingsCache();
        }
        
        // Force reactivity update
        await nextTick();
        console.log('🔄 [API POLL] Settings after update:', settingsParams.value);
      } catch (e) {
        console.warn('[API POLL] Could not refresh device settings:', e);
        deviceSettings.value = null;
      }
    };

    // Function to refresh device details page
    const refreshDeviceData = async () => {
      console.log('🔄 Refreshing device details...');
      try {
        // Refresh device settings
        await refreshDeviceSettings();
        
        // Refresh telemetry data
        if (deviceId.value) {
          ApiService.setHeader();
          const telemetryResp = await ApiService.query('/api/telemetry', { params: { deviceId: deviceId.value, limit: 1, sort: '-timestamp' } });
          if (telemetryResp?.data?.data && telemetryResp.data.data.length > 0) {
            const telemetryData = telemetryResp.data.data[0];
            console.log('📊 Refreshed telemetry data:', telemetryData);
            mainDevice.value = telemetryData;
            
            // Convert timestamp to milliseconds for comparison
            const timestamp = telemetryData.timestamp;
            if (timestamp) {
              const timestampMs = typeof timestamp === 'string' 
                ? new Date(timestamp).getTime() 
                : timestamp;
              lastMainUpdate.value = timestampMs;
            }
          }
        }
        console.log('✅ Device details refreshed successfully');
      } catch (err) {
        console.error('Error refreshing device details:', err);
      }
    };

    onMounted(() => {
      // Get device id from route params
      const route = useRoute();
      deviceId.value = (route.params.id as string) || null;

      // Fetch device settings and recent telemetry for this specific device
      (async () => {
        try {
          if (deviceId.value) {
            ApiService.setHeader();
            
            // 1. ALWAYS load device settings from database first (persisted data)
            console.log('📥 Loading device settings from database...');
            await refreshDeviceSettings();

            // 2. Load latest telemetry data for Device Controls display
            try {
              const telemetryResp = await ApiService.query('/api/telemetry', { params: { deviceId: deviceId.value, limit: 1, sort: '-timestamp' } });
              if (telemetryResp?.data?.data && telemetryResp.data.data.length > 0) {
                const telemetryData = telemetryResp.data.data[0];
                console.log('📊 Loaded telemetry from database:', telemetryData);
                mainDevice.value = telemetryData;
                
                // Convert timestamp to milliseconds for comparison
                const timestamp = telemetryData.timestamp;
                if (timestamp) {
                  const timestampMs = typeof timestamp === 'string' 
                    ? new Date(timestamp).getTime() 
                    : timestamp;
                  lastMainUpdate.value = timestampMs;
                } else {
                  lastMainUpdate.value = Date.now() - (FAILOVER_TIMEOUT_MS + 1000); // Mark as old
                }
                console.log('✅ Telemetry data loaded and device controls should show data');
              } else {
                console.log('ℹ️ No telemetry data available yet for device');
              }
            } catch (e) {
              console.warn('Could not load telemetry for device:', e);
            }
            
            // 3. Settings are now loaded from database and will update via Socket.IO when device sends new data
            // No continuous polling needed - device sends settings on startup and changes are tracked
            console.log('✅ Initial data loaded from database');
          }
        } catch (err) {
          console.error('Error during device-specific initialization', err);
        }
      })();

      // Helper function to update connection status with debouncing
      const updateConnectionStatus = (newStatus: string) => {
        const now = Date.now();
        if (now - lastConnectionStatusUpdate >= connectionStatusDebounceTime) {
          if (connectionStatus.value !== newStatus) {
            connectionStatus.value = newStatus;
            lastConnectionStatusUpdate = now;
            console.log(`🔗 Connection status changed to: ${newStatus}`);
          }
        }
      };
      // Initialize MQTT service
      mqttService.initialize();
      
      // Connect to backend Socket.io server - use environment variable
      const backendUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';
      console.log('🔌 Connecting to Socket.IO backend:', backendUrl);
      
      socket.value = io(backendUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      // Connection status handling
      socket.value.on('connect', () => {
        updateConnectionStatus('connected');
        console.log('✅ Socket.IO Connected to backend server');
        console.log('🔍 Current deviceId from route:', deviceId.value);
        // If viewing a specific device, subscribe to its updates
        try {
          if (deviceId.value) {
            // Subscribe using the provided id, and also try a prefixed form commonly used by the sim/backend
            console.log('📡 Subscribing to device updates:', deviceId.value);
            socket.value?.emit('subscribeDevice', deviceId.value);
            // If the route id is numeric (e.g. "123"), also subscribe to "DEVICE_123" room which the sim emits to
            if (/^\d+$/.test(deviceId.value)) {
              console.log('📡 Also subscribing to prefixed device room:', `DEVICE_${deviceId.value}`);
              socket.value?.emit('subscribeDevice', `DEVICE_${deviceId.value}`);
            }
          }
        } catch (e) {
          console.warn('subscribe emit failed', e);
        }
      });

      socket.value.on('disconnect', () => {
        updateConnectionStatus('disconnected');
        console.log('Disconnected from backend server');
      });

      // Handle initial data when client first connects
      socket.value.on('initialData', (data) => {
        console.log('Received initial data:', data);
        
        // Update connection status from initial data
        if (data.connectionStatus && data.connectionStatus.device !== undefined) {
          updateConnectionStatus(data.connectionStatus.device ? 'connected' : 'disconnected');
        }
        
        // If server sends device-specific initialData (subscribe flow), accept it only for our device
        if (deviceId.value) {
          if (data.main && data.main.id === deviceId.value) {
            mainDevice.value = data.main;
            lastMainUpdate.value = data.main.timestamp || Date.now();
          }
          if (data.sim && data.sim.id === deviceId.value) {
            simDevice.value = data.sim;
          }
        } else {
          if (data.main) {
            mainDevice.value = data.main;
            lastMainUpdate.value = data.main.timestamp || Date.now();
          }
          if (data.sim) {
            simDevice.value = data.sim;
          }
        }
      });

      // Handle real-time device updates
      socket.value.on('deviceUpdate', (update) => {
        console.log('🔄 Received deviceUpdate event:', update);
        try {
          // Determine the target device id from the incoming update.
          // Prefer a topic string like 'devices/123/data' if provided, else fall back to payload fields.
          let updatedId: string | null = null;
          try {
            if (update && typeof update.topic === 'string') {
              const parts = update.topic.split('/').filter(Boolean);
              if (parts.length >= 2) {
                // topic format expected: devices/{deviceId}/data
                updatedId = parts[1];
              }
            }
          } catch (e) {
            // ignore parsing errors
          }

          if (!updatedId) {
            updatedId = update?.data?.id || update?.deviceId || null;
          }

          // Normalization helper: extract comparable key (strip 'DEVICE_' prefix and non-digits)
          const norm = (id: string | null) => {
            if (!id) return null;
            try {
              // If id contains digits, return only the digit part to allow matching '123' and 'DEVICE_123'
              const digits = String(id).match(/\d+/);
              if (digits) return digits[0];
              // otherwise return the raw id
              return String(id);
            } catch (e) {
              return String(id);
            }
          };

          const updatedKey = norm(updatedId);
          const routeKey = norm(deviceId.value);

          // If we have a specific deviceId route, only apply updates for that device
          if (deviceId.value) {
            if (updatedKey && routeKey && updatedKey === routeKey) {
              console.log('✅ Device ID matches, updating data. Route:', routeKey, 'Update:', updatedKey);
              if (update.type === 'main' || update.type === 'device') {
                console.log('📊 Updating device telemetry data:', update.data);
                console.log('📊 Previous mainDevice:', mainDevice.value);
                mainDevice.value = update.data;
                lastMainUpdate.value = Date.now();
                console.log('📊 New mainDevice:', mainDevice.value);
                
                // Update connection status if provided
                if (update.connectionStatus && update.connectionStatus.device !== undefined) {
                  updateConnectionStatus(update.connectionStatus.device ? 'connected' : 'disconnected');
                }
              } else if (update.type === 'sim') {
                simDevice.value = update.data;
              } else if (update.type === 'status') {
                // Handle status-only updates
                if (update.connectionStatus && update.connectionStatus.device !== undefined) {
                  updateConnectionStatus(update.connectionStatus.device ? 'connected' : 'disconnected');
                }
              }
            }
          } else {
            // No specific device requested: apply broadcast updates
            if (update.type === 'main' || update.type === 'device') {
              mainDevice.value = update.data;
              lastMainUpdate.value = Date.now();
              
              // Update connection status if provided
              if (update.connectionStatus && update.connectionStatus.device !== undefined) {
                updateConnectionStatus(update.connectionStatus.device ? 'connected' : 'disconnected');
              }
            } else if (update.type === 'sim') {
              simDevice.value = update.data;
            } else if (update.type === 'status') {
              // Handle status-only updates
              if (update.connectionStatus && update.connectionStatus.device !== undefined) {
                updateConnectionStatus(update.connectionStatus.device ? 'connected' : 'disconnected');
              }
            }
          }
        } catch (err) {
          console.warn('Error handling deviceUpdate', err);
        }
      });

      // Listen for real-time device settings updates
      socket.value.on('deviceSettingsUpdate', (update) => {
        console.log('📡 Received real-time settings update from socket:', update);
        console.log('📡 Current device ID:', deviceId.value, 'Update device ID:', update.deviceId);
        
        if (update.deviceId === deviceId.value) {
          // Create the format expected by our deviceSettings ref
          const formattedSettings = {
            "Device ID": update.deviceId,
            "Message Type": "settings",
            "sender": "Server",
            "Parameters": update.settings
          };
          
          console.log('⚡ [SOCKET] Updating deviceSettings with real-time data:', formattedSettings);
          deviceSettings.value = formattedSettings;
          // Force reactivity update
          nextTick(() => {
            console.log('🔄 [SOCKET] Settings updated, current params:', settingsParams.value);
          });
          
          // Refresh from database to ensure persistence after real-time update
          console.log('🔄 Refreshing from database to confirm persistence');
          setTimeout(() => refreshDeviceSettings(), 1000);
        }
      });

      // Listen for dedicated connection status updates
      socket.value.on('connectionStatus', (status) => {
        try {
          if (status && status.device !== undefined) {
            updateConnectionStatus(status.device ? 'connected' : 'disconnected');
          }
        } catch (err) {
          console.warn('Error handling connectionStatus', err);
        }
      });

      // Listen for pong responses
      socket.value.on('pong', () => {
        lastPingTime = Date.now();
        console.log('📡 Pong received from backend');
        updateConnectionStatus('connected');
        
        // Clear any pending timeout
        if (pingTimeoutId) {
          clearTimeout(pingTimeoutId);
          pingTimeoutId = null;
        }
      });

      // Send ping to backend at regular intervals
      const sendPing = () => {
        if (socket.value?.connected) {
          lastPingTime = Date.now();
          console.log('📡 Sending ping to backend...');
          socket.value?.emit('ping');
          
          // Set a timeout - if no pong received within pingTimeout, mark as disconnected
          pingTimeoutId = setTimeout(() => {
            console.log('⏱️ Ping timeout - no pong received');
            updateConnectionStatus('disconnected');
          }, pingTimeout);
        }
      };

      // Start ping interval (2 minutes)
      pingCheckInterval = setInterval(sendPing, pingInterval);
      
      // Send initial ping immediately
      sendPing();

      // Periodically update 'now' so computed property reacts to time
      updateInterval.value = setInterval(() => {
        now.value = Date.now();
      }, 1000);
    });

    onUnmounted(() => {
      if (socket.value) {
        // Unsubscribe from device room if needed
        try {
          if (deviceId.value) {
            socket.value.emit('unsubscribeDevice', deviceId.value);
            if (/^\d+$/.test(deviceId.value)) {
              socket.value.emit('unsubscribeDevice', `DEVICE_${deviceId.value}`);
            }
          }
        } catch (e) {}
        socket.value.disconnect();
      }
      if (updateInterval.value) {
        clearInterval(updateInterval.value);
      }
      if (pingCheckInterval) {
        clearInterval(pingCheckInterval);
      }
      if (pingTimeoutId) {
        clearTimeout(pingTimeoutId);
      }
      // Disconnect MQTT service
      mqttService.disconnect();
    });

    // ✅ NEW: Calculate dynamic timeout based on logging interval
    // Rules:
    // 1. Minimum timeout = 1 minute (60 seconds)
    // 2. If logging interval > 1 min: timeout = logging_interval + 1 min
    // 3. If logging interval < 1 min: timeout = 1 min (fixed)
    const dynamicTimeoutMs = computed(() => {
      const MINIMUM_TIMEOUT_SECONDS = 60; // 1 minute minimum
      const TIMEOUT_BUFFER_SECONDS = 60;   // +1 minute buffer
      
      // Try multiple parameter name variations (camelCase and space-separated)
      const loggingIntervalStr = 
        settingsParams.value?.loggingInterval || 
        settingsParams.value?.['loggingInterval'] ||
        settingsParams.value?.['Logging Interval'] || 
        '00:01:00';  // Default: 1 minute
      
      try {
        // Parse HH:MM:SS format
        const [hours, minutes, seconds] = loggingIntervalStr.split(':').map(Number);
        const loggingIntervalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        
        // Calculate timeout based on rules:
        let totalTimeoutSeconds;
        
        if (loggingIntervalSeconds < MINIMUM_TIMEOUT_SECONDS) {
          // Rule 3: If logging interval < 1 min, use fixed 1 min timeout
          totalTimeoutSeconds = MINIMUM_TIMEOUT_SECONDS;
          console.log(`📊 [TIMEOUT] Logging interval: ${loggingIntervalStr} (${loggingIntervalSeconds}s) is less than 1 min → Using minimum: ${MINIMUM_TIMEOUT_SECONDS}s`);
        } else {
          // Rule 2: If logging interval >= 1 min, add 1 min buffer
          totalTimeoutSeconds = loggingIntervalSeconds + TIMEOUT_BUFFER_SECONDS;
          console.log(`📊 [TIMEOUT] Logging interval: ${loggingIntervalStr} (${loggingIntervalSeconds}s) + buffer (${TIMEOUT_BUFFER_SECONDS}s) → Timeout: ${totalTimeoutSeconds}s`);
        }
        
        const timeoutMs = totalTimeoutSeconds * 1000;
        return timeoutMs;
      } catch (e) {
        console.warn('⚠️ [TIMEOUT] Failed to parse logging interval, using default 1 minute:', e);
        return MINIMUM_TIMEOUT_SECONDS * 1000; // Default: 1 minute (60 seconds)
      }
    });


    // Computed property for displaying device with failover
    const displayedDevice = computed(() => {
      // ✅ Use dynamic timeout based on logging interval instead of fixed 10 seconds
      if (mainDevice.value && now.value - lastMainUpdate.value <= dynamicTimeoutMs.value) {
        // ✅ Within timeout = ONLINE
        const onlineDevice = {
          ...mainDevice.value,
          status: 'online'
        };
        return onlineDevice;
      }
      // ✅ Beyond timeout = OFFLINE (no stored data fallback)
      else if (mainDevice.value) {
        const offlineDevice = {
          ...mainDevice.value,
          status: 'offline',  // ✅ Mark as offline if beyond timeout
          metrics: mainDevice.value.metrics || getDeviceMetrics(mainDevice.value)
        };
        return offlineDevice;
      }
      // Fallback to sim device
      else if (simDevice.value) {
        return simDevice.value;
      }
      return null;
    });


    // Helper function to create basic metrics from settings when no telemetry available
    const getBasicMetricsFromSettings = () => {
      const params = deviceSettings.value?.Parameters;
      if (!params) return [];
      
      // Backend already converts values to decimal format (e.g., "91.9", "25.50")
      // Just display them as-is with appropriate units
      const formatShuntValue = (value: any) => {
        if (!value && value !== 0) return '0.0';
        const numValue = parseFloat(value || 0);
        return isNaN(numValue) ? '0.0' : numValue.toFixed(1);
      };
      
      return [
        { type: "ELECTRODE", value: getElectrodeLabel(params.Electrode || 0), icon: "bi-plug" },
        { type: "SHUNT_V", value: `${formatShuntValue(params['Shunt Voltage'])} V`, icon: "bi-lightning" },
        { type: "SHUNT_I", value: `${formatShuntValue(params['Shunt Current'])} mA`, icon: "bi-dash-circle" }
      ];
    };

    // Helper function to format REF values - show OPEN if above 4.00V
    const formatRefValue = (value: any) => {
      // If already formatted as OPEN, return as-is
      if (value === 'OPEN') return 'OPEN';
      
      if (!value && value !== 0) return '0.00';
      
      // Convert to string and remove any +/- signs for parsing, then parse
      const stringValue = value.toString().trim();
      const numValue = parseFloat(stringValue);
      
      if (isNaN(numValue)) return '0.00';
      
      // Show OPEN if value is 4.00 or greater
      return numValue >= 4.00 ? 'OPEN' : numValue.toFixed(2);
    };

    // Helper function to format voltage values (Set UP, Set OP, Reference Fail)
    // Converts integer format (123 → 1.23 or -800 → -8.00) to decimal format if needed
    const formatVoltageValue = (value: any, decimals: number = 2) => {
      if (!value && value !== 0) return '0.00';
      let numValue = parseFloat(value.toString());
      if (isNaN(numValue)) return '0.00';
      
      // If absolute value >= 5, it's in integer format (multiply by 100), so divide by 100
      if (Math.abs(numValue) >= 5) {
        numValue = numValue / 100;
      }
      
      return numValue.toFixed(decimals);
    };

    // Helper function to map digital I/O values
    const mapDigitalIOValue = (value: any) => {
      // Already mapped string values
      if (value === 'CLOSE' || value === 'OPEN' || value === 'ON' || value === 'OFF') {
        return value;
      }
      // Convert numeric values: 1 = CLOSE/ON, 0 = OPEN/OFF
      const numValue = parseInt(value);
      return numValue === 1 ? 'CLOSE' : 'OPEN';
    };

    // Helper function to extract metrics from device data (both live and stored)
    const getDeviceMetrics = (deviceData: any) => {
      if (!deviceData) return [];
      
      // If metrics already exist and are valid, reformat REF values properly
      if (deviceData.metrics && Array.isArray(deviceData.metrics) && deviceData.metrics.length > 0) {
        // Filter out ACI and EVENT, and reformat REF values
        return deviceData.metrics.map((m: any) => {
          // Reformat REF values to show OPEN if >= 4.00
          if (['REF1', 'REF2', 'REF3'].includes(m.type)) {
            return {
              ...m,
              value: formatRefValue(m.value)
            };
          }
          return m;
        }).filter((m: any) => !['ACI', 'EVENT'].includes(m.type));
      }
      
      // For stored telemetry data, extract from the 'data' field
      const data = deviceData.data || deviceData;
      
      // Get event label properly - clean up and convert to proper label
      let eventValue = data.EVENT || data.event;
      if (eventValue !== undefined && eventValue !== null) {
        const eventStr = String(eventValue).trim();
        
        // First, try to extract numeric code if present
        const numMatch = eventStr.match(/^(\d+)/);
        if (numMatch) {
          const eventNum = parseInt(numMatch[1]);
          if (!isNaN(eventNum)) {
            eventValue = getEventLabel(eventNum);
          } else {
            eventValue = eventStr;
          }
        } else {
          // If no numeric code, check if it's already a known label
          // Extract just the first part before any parentheses or extra text
          const parts = eventStr.split(/[()]/);
          const firstPart = parts[0].trim();
          
          // Map common string values to proper labels
          const labelMap: Record<string, string> = {
            'Normal': 'Normal',
            'Interrupt': 'Interrupt',
            'INT': 'Interrupt',
            'INT ON': 'Interrupt',
            'Manual': 'Manual',
            'DPOL': 'DEPOL',
            'Instant': 'Instant',
            'INST': 'Instant'
          };
          
          eventValue = labelMap[firstPart] || (firstPart || 'Unknown');
        }
      } else {
        eventValue = 'Unknown';
      }
      
      // Provide robust extraction with proper defaults
      const metrics = [
        { type: 'LOG', value: data.LOG || data.log || 0, icon: 'bi-journal-text' },
        { type: 'REF1', value: formatRefValue(data.REF1 || data.ref1), icon: 'bi-graph-up' },
        { type: 'REF2', value: formatRefValue(data.REF2 || data.ref2), icon: 'bi-graph-up' },
        { type: 'REF3', value: formatRefValue(data.REF3 || data.ref3), icon: 'bi-graph-up' },
        { type: 'DCV', value: data.DCV || data.dcv || '0.00', icon: 'bi-battery-charging' },
        { type: 'DCI', value: data.DCI || data.dci || '0.00', icon: 'bi-lightning-charge' },
        { type: 'ACV', value: data.ACV || data.acv || '0.00', icon: 'bi-battery' },
        { type: 'DI1', value: mapDigitalIOValue(data.DI1 || data.di1 || 0), icon: 'bi-toggle-on', category: 'Digital Input' },
        { type: 'DI2', value: mapDigitalIOValue(data.DI2 || data.di2 || 0), icon: 'bi-toggle-on', category: 'Digital Input' },
        { type: 'DI3', value: mapDigitalIOValue(data.DI3 || data.di3 || 0), icon: 'bi-toggle-on', category: 'Digital Input' },
        { type: 'DI4', value: mapDigitalIOValue(data.DI4 || data.di4 || 0), icon: 'bi-toggle-on', category: 'Digital Input' },
        { type: 'DO1', value: mapDigitalIOValue(data.DO1 || data.do1 || 0), icon: 'bi-arrow-right-square', category: 'Digital Output' }
      ];
      
      return metrics;
    };

    // Non-blocking safe device used by the template so the UI doesn't wait for live data
    const safeDevice = computed(() => {
      if (displayedDevice.value) {
        // ALWAYS recalculate metrics to ensure proper formatting with current logic (e.g., REF values)
        const device = {
          ...displayedDevice.value,
          metrics: getDeviceMetrics(displayedDevice.value)
        };
        
        return device;
      }
      
      // If no telemetry data but we have device settings, create a basic device object
      const hasSettings = deviceSettings.value?.Parameters && Object.keys(deviceSettings.value.Parameters).length > 0;
      
      return {
        name: hasSettings ? `Device ${deviceId.value}` : 'Unknown Device',
        location: 'N/A',
        type: hasSettings ? 'IoT Sensor' : 'Unknown',
        status: hasSettings ? 'offline' : 'offline',  // ✅ Default to offline if no real-time data
        lastSeen: hasSettings ? 'Settings Available' : 'Never',
        metrics: hasSettings ? getBasicMetricsFromSettings() : []
      };
    });

    // Helper function to convert degree format coordinates to decimal
    const convertDegreesToDecimal = (degreeStr: string): number | null => {
      try {
        // Format: "19°03'N" or "072°52'E"
        const match = degreeStr.match(/(\d+)°(\d+)['′]([NSEW])/i);
        if (!match) return null;
        
        const degrees = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const direction = match[3].toUpperCase();
        
        // Convert to decimal: degrees + minutes/60
        let decimal = degrees + (minutes / 60);
        
        // Add seconds if present
        const fullMatch = degreeStr.match(/(\d+)°(\d+)['′](\d+)?["″]?([NSEW])/i);
        if (fullMatch && fullMatch[3]) {
          const seconds = parseInt(fullMatch[3]);
          decimal += seconds / 3600;
        }
        
        // Apply direction (S and W are negative)
        if (direction === 'S' || direction === 'W') {
          decimal = -decimal;
        }
        
        return decimal;
      } catch (e) {
        return null;
      }
    };

    // Abstract location (sector/district)
    const abstractLocation = ref('');

    watch(displayedDevice, async (device) => {
      if (device && typeof device.location === 'string') {
        let lat: number | null = null;
        let lon: number | null = null;
        
        // Check if location is in decimal format
        if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(device.location)) {
          [lat, lon] = device.location.split(',').map(s => parseFloat(s.trim()));
        }
        // Check if location is in degree format (e.g., "19°03'N, 072°52'E")
        else if (/^\d+°\d+['′][NSEW],\s*\d+°\d+['′][NSEW]/i.test(device.location)) {
          const parts = device.location.split(',').map(s => s.trim());
          if (parts.length === 2) {
            lat = convertDegreesToDecimal(parts[0]);
            lon = convertDegreesToDecimal(parts[1]);
          }
        }
        
        // If we have valid coordinates, perform reverse geocoding
        if (lat !== null && lon !== null && lat !== 0 && lon !== 0) {
          const data = await reverseGeocode(lat, lon);
          // Try to extract sector/district/city/town/village
          let area = '';
          if (data && data.address) {
            // Concatenate relevant fields for specificity
            const parts: string[] = [];
            if (data.address.city_district) parts.push(data.address.city_district);
            if (data.address.suburb) parts.push(data.address.suburb);
            if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
            if (data.address.city) parts.push(data.address.city);
            if (data.address.town) parts.push(data.address.town);
            if (data.address.village) parts.push(data.address.village);
            if (data.address.state_district) parts.push(data.address.state_district);
            if (data.address.state) parts.push(data.address.state);
            if (data.address.county) parts.push(data.address.county);
            if (data.address.country) parts.push(data.address.country);
            // Remove duplicates and join
            area = Array.from(new Set(parts)).join(', ');
            if (!area && data.display_name) {
              area = data.display_name.split(',').slice(0,3).join(', ');
            }
            if (!area) area = device.location;
          } else if (data && data.display_name) {
            area = data.display_name.split(',').slice(0,3).join(', ');
          } else {
            area = device.location;
          }
          abstractLocation.value = area;
        } else {
          abstractLocation.value = device.location;
        }
      }
    }, { immediate: true });
    const statusClass = computed(() => {
      const status = displayedDevice.value?.status;
      // ✅ Only two states: online (green) or offline (red)
      switch (status) {
        case 'online':
          return 'badge-light-success';  // Green
        case 'offline':
          return 'badge-light-danger';   // Red
        default:
          return 'badge-light-danger';   // Default to red/offline
      }
    });

    const metricClass = (metric: any) => {
      // Handle digital I/O values
      if ((metric.type.includes('DI') || metric.type.includes('DO')) && typeof metric.value === 'string') {
        if (metric.value === 'CLOSE') return 'text-success';
        if (metric.value === 'OPEN') return 'text-danger';
      }
      if (metric.type.toLowerCase().includes('battery') && metric.value <= 20) return 'text-danger';
      if (metric.type.toLowerCase().includes('signal') && metric.value <= 50) return 'text-warning';
      return 'text-primary';
    };

    const connectionStatusClass = computed(() => {
      return connectionStatus.value === 'connected' ? 'text-success' : 'text-danger';
    });

    // Helper functions to convert codes to labels
    const getElectrodeLabel = (code: number) => {
      const labels: Record<number, string> = {
        0: 'Cu/CuSO4',
        1: 'Zinc',
        2: 'Ag/AgCl'
      };
      return labels[code] || 'Unknown';
    };

    const getEventLabel = (code: number) => {
      const labels: Record<number, string> = {
        0: 'Normal',
        1: 'Interrupt',
        2: 'Manual',
        3: 'DEPOL',
        4: 'Instant'
      };
      return labels[code] || 'Unknown';
    };

    const getInstantModeLabel = (code: number) => {
      const labels: Record<number, string> = {
        0: 'Daily',
        1: 'Weekly'
      };
      return labels[code] || 'Unknown';
    };

    // Computed property for settings parameters
    const settingsParams = computed(() => {
      const settings = deviceSettings.value;
      if (!settings) return {};
      
      const params = settings.Parameters || settings.data?.Parameters || settings['Parameters'] || {};
      console.log('🔄 SettingsParams computed:', {
        'Shunt Voltage': params['Shunt Voltage'],
        'Shunt Current': params['Shunt Current'],
        fullParams: params
      });
      return params;
    });

    const hasSettings = computed(() => {
      return settingsParams.value !== null && settingsParams.value !== undefined;
    });

    // Computed property for current device mode (0-4)
    const currentMode = computed(() => {
      const eventCode = settingsParams.value?.Event;
      return typeof eventCode === 'number' ? eventCode : 0;
    });

    // Helper to check if a mode is active
    const isModeActive = (modeCode: number): boolean => {
      return currentMode.value === modeCode;
    };

    // Computed property for Set UP range text based on electrode type
    const setUpRangeText = computed(() => {
      const electrodeCode = settingsParams.value?.Electrode;
      if (electrodeCode === 1) {
        return '-0.50 to -0.10 for Zinc';
      } else if (electrodeCode === 2) {
        return '0.60 to 1.00 for Ag/AgCl';
      } else {
        return '0.60 to 1.00 for Cu/cuso4';
      }
    });

    // Computed property for Set OP range text based on electrode type
    const setOpRangeText = computed(() => {
      const electrodeCode = settingsParams.value?.Electrode;
      if (electrodeCode === 1) {
        return '0.10 to 1.90 for Zinc';
      } else if (electrodeCode === 2) {
        return '1.20 to 3.00 for Ag/AgCl';
      } else {
        return '1.20 to 3.00 for Cu/cuso4';
      }
    });

    // Helper function to get Set UP min/max based on electrode type
    const getSetUpLimits = () => {
      const electrodeCode = settingsParams.value?.Electrode;
      if (electrodeCode === 1) {
        // Zinc: -0.50 to -0.10
        return { min: -0.50, max: -0.10 };
      } else if (electrodeCode === 2) {
        // Ag/AgCl: 0.60 to 1.00
        return { min: 0.60, max: 1.00 };
      } else {
        // Cu/cuso4: 0.60 to 1.00 (default)
        return { min: 0.60, max: 1.00 };
      }
    };

    // Helper function to get Set OP min/max based on electrode type
    const getSetOpLimits = () => {
      const electrodeCode = settingsParams.value?.Electrode;
      if (electrodeCode === 1) {
        // Zinc: 0.10 to 1.90
        return { min: 0.10, max: 1.90 };
      } else if (electrodeCode === 2) {
        // Ag/AgCl: 1.20 to 3.00
        return { min: 1.20, max: 3.00 };
      } else {
        // Cu/cuso4: 1.20 to 3.00 (default)
        return { min: 1.20, max: 3.00 };
      }
    };

    // Modal/Popup functionality
    const showLogModal = ref<boolean>(false);
    const loggingInterval = ref<string>('00:01:00');
    const showModeModal = ref<boolean>(false);
    const showElectrodeModal = ref<boolean>(false);
    
    // Mode options and sub-modals
    const showNormalModal = ref<boolean>(false);
    const showAutoModal = ref<boolean>(false);
    const showManualModal = ref<boolean>(false);
    const showDpolModal = ref<boolean>(false);
    const showInstModal = ref<boolean>(false);
    const showAlarmModal = ref<boolean>(false);
    const showAlarmSetupModal = ref<boolean>(false);
    const showAlarmSetopModal = ref<boolean>(false);
    const showAlarmReffcalModal = ref<boolean>(false);
    const showShuntVoltageModal = ref<boolean>(false);
    const showShuntCurrentModal = ref<boolean>(false);
    const showSetNoModal = ref<boolean>(false);
    const savingConfiguration = ref<boolean>(false);

    // Interrupt mode form data
    const autoForm = ref({
      startDate: '',
      startTime: '',
      stopDate: '',
      stopTime: '',
      onTime: 86400, // On time in seconds (24 hours)
      offTime: 86400 // Off time in seconds (24 hours)
    });

    // DPOL mode form data
    const dpolForm = ref({
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      interval: '00:00:05'
    });

    // INST mode form data
    const instForm = ref({
      startTime: '',
      frequency: 'daily'
    });

    // Electrode selection data
    const selectedElectrode = ref<string>('');

    // Alarm item form data
    const alarmSetupForm = ref({
      value: '0.00',
      unit: ''
    });

    // Manual mode timer refs - Seconds only (in 0000.0 format)
    const onSeconds = ref<string>('86400.0');
    const offSeconds = ref<string>('86400.0');

    // SET NO Timer Configuration Form
    const setNoForm = ref({
      ton: {
        field1: 0,
        field2: 0,
        field3: 0,
        field4: 0,
        field5: 0,
        field6: 0
      },
      toff: {
        field1: 0,
        field2: 0,
        field3: 0,
        field4: 0,
        field5: 0,
        field6: 0
      }
    });

    // Watch for changes and update autoForm.onTime and autoForm.offTime
    watch([onSeconds], () => {
      autoForm.value.onTime = parseFloat(onSeconds.value) || 0;
    });

    watch([offSeconds], () => {
      autoForm.value.offTime = parseFloat(offSeconds.value) || 0;
    });

    // Track last processed settings to prevent duplicate updates
    let lastProcessedSettings: string | null = null;

    // Watch deviceSettings to populate ALL form values from device data
    watch(deviceSettings, (newSettings) => {
      console.log('📡 Device settings changed:', newSettings);
      if (newSettings?.Parameters) {
        const params = newSettings.Parameters;
        
        // Create a stable hash by sorting keys to handle different property orders
        const createStableHash = (obj: any) => {
          const sortedKeys = Object.keys(obj).sort();
          const sortedObj: any = {};
          sortedKeys.forEach(key => {
            sortedObj[key] = obj[key];
          });
          return JSON.stringify(sortedObj);
        };
        
        const settingsHash = createStableHash(params);
        
        // Skip update if settings haven't actually changed
        if (settingsHash === lastProcessedSettings) {
          console.log('⏭️ Settings unchanged, skipping form update (hash match)');
          return;
        }
        
        lastProcessedSettings = settingsHash;
        
        const onTime = params['Interrupt ON Time'] || 0;
        const offTime = params['Interrupt OFF Time'] || 0;
        
        // Format seconds with one decimal place (0000.0 format)
        onSeconds.value = (onTime || 0).toFixed(1);
        offSeconds.value = (offTime || 0).toFixed(1);
        autoForm.value.onTime = onTime;
        autoForm.value.offTime = offTime;
        
        // Update autoForm timestamps if available
        if (params['Interrupt Start TimeStamp']) {
          const [date, time] = params['Interrupt Start TimeStamp'].split(' ');
          if (date && time) {
            autoForm.value.startDate = date;
            autoForm.value.startTime = time;
          }
        }
        if (params['Interrupt Stop TimeStamp']) {
          const [date, time] = params['Interrupt Stop TimeStamp'].split(' ');
          if (date && time) {
            autoForm.value.stopDate = date;
            autoForm.value.stopTime = time;
          }
        }
        
        // Update dpolForm values
        if (params['Depolarization Start TimeStamp']) {
          const [date, time] = params['Depolarization Start TimeStamp'].split(' ');
          if (date && time) {
            dpolForm.value.startDate = date;
            dpolForm.value.startTime = time;
          }
        }
        if (params['Depolarization Stop TimeStamp']) {
          const [date, time] = params['Depolarization Stop TimeStamp'].split(' ');
          if (date && time) {
            dpolForm.value.endDate = date;
            dpolForm.value.endTime = time;
          }
        }
        
        // Populate Depolarization interval if available
        if (params['Depolarization_interval']) {
          dpolForm.value.interval = params['Depolarization_interval'];
          console.log('✅ [WATCH] Set DPOL interval from Depolarization_interval:', params['Depolarization_interval']);
        }
        
        // Update instForm values
        if (params['Instant Mode'] !== undefined) {
          instForm.value.frequency = params['Instant Mode'] === 0 ? 'daily' : 'weekly';
        }
        if (params['Instant Start TimeStamp']) {
          instForm.value.startTime = params['Instant Start TimeStamp'];
        }
        
        // All forms updated successfully
      } else {
        // No device parameters received
      }
    }, { immediate: true }); // Removed deep:true to prevent nested property triggers

    // Watch loggingInterval to auto-shift 00:00:00 to meaningful value
    watch(loggingInterval, (newValue) => {
      if (newValue === '00:00:00') {
        // Use nextTick to avoid infinite loop and allow the input to update first
        nextTick(() => {
          loggingInterval.value = '00:01:00';
        });
      }
    });

    // Watch DPOL modal to refresh form whenever it's opened
    watch(showDpolModal, (isOpen) => {
      if (isOpen) {
        console.log('📋 [DPOL] Modal opened, refreshing form from device settings');
        nextTick(() => {
          populateDpolFormFromSettings();
        });
      }
    });

    // Helper functions for timer
    const formatTotalTime = (seconds: string) => {
      const total = parseFloat(seconds) || 0;
      if (total === 0) return '0 seconds';
      
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = Math.floor(total % 60);
      
      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (secs > 0) parts.push(`${secs}s`);
      
      return parts.length > 0 ? parts.join(' ') + ` (${total}s total)` : '0 seconds';
    };

    const setOnTime = (totalSeconds: number) => {
      onSeconds.value = totalSeconds.toFixed(1);
    };

    const setOffTime = (totalSeconds: number) => {
      offSeconds.value = totalSeconds.toFixed(1);
    };

    // Helper function to populate Auto/Interrupt form from device settings
    const populateAutoFormFromSettings = () => {
      console.log('🔍 DEBUG AUTO: populateAutoFormFromSettings called');
      
      if (deviceSettings.value?.Parameters) {
        const params = deviceSettings.value.Parameters;
        console.log('🔍 DEBUG AUTO: Available parameters:', Object.keys(params));
        
        // Populate timer values if available
        const onTime = params['Interrupt ON Time'] || 0;
        const offTime = params['Interrupt OFF Time'] || 0;
        console.log('🔍 DEBUG AUTO: Timer values - ON:', onTime, 'OFF:', offTime);
        
        autoForm.value.onTime = onTime;
        autoForm.value.offTime = offTime;
        
        // CRITICAL: Update timer component values for modal form inputs
        // Format seconds with one decimal place (0000.0 format)
        onSeconds.value = (onTime || 0).toFixed(1);
        offSeconds.value = (offTime || 0).toFixed(1);
        
        console.log('🔍 DEBUG AUTO: Converted timer values:', {
          onSeconds: onSeconds.value,
          offSeconds: offSeconds.value
        });
        
        // Populate timestamps if available - try both display format and camelCase format
        const startTimestamp = params['Interrupt Start TimeStamp'] || params['interruptStartTimestamp'];
        const stopTimestamp = params['Interrupt Stop TimeStamp'] || params['interruptStopTimestamp'];
        
        if (startTimestamp) {
          const [date, time] = startTimestamp.split(' ');
          console.log('🔍 DEBUG AUTO: Start timestamp split:', { date, time, original: startTimestamp });
          if (date && time) {
            autoForm.value.startDate = date;
            autoForm.value.startTime = time;
          }
        }
        if (stopTimestamp) {
          const [date, time] = stopTimestamp.split(' ');
          console.log('🔍 DEBUG AUTO: Stop timestamp split:', { date, time, original: stopTimestamp });
          if (date && time) {
            autoForm.value.stopDate = date;
            autoForm.value.stopTime = time;
          }
        }
        
        console.log('🔍 DEBUG AUTO: Final autoForm values:', {
          startDate: autoForm.value.startDate,
          startTime: autoForm.value.startTime,
          stopDate: autoForm.value.stopDate,
          stopTime: autoForm.value.stopTime,
          onTime: autoForm.value.onTime,
          offTime: autoForm.value.offTime
        });
      } else {
        console.log('⚠️ DEBUG AUTO: No device settings available');
      }
    };

    // Helper function to populate DPOL form from device settings
    const populateDpolFormFromSettings = () => {
      if (deviceSettings.value?.Parameters) {
        const params = deviceSettings.value.Parameters;
        
        console.log('📝 [DPOL] Populating form from parameters:', params);
        
        // Populate timestamps if available - try both display format and camelCase format
        const startTimestamp = params['Depolarization Start TimeStamp'] || params['depolarizationStartTimestamp'];
        const stopTimestamp = params['Depolarization Stop TimeStamp'] || params['depolarizationStopTimestamp'];
        
        console.log('📝 [DPOL] Timestamps:', { startTimestamp, stopTimestamp });
        
        // IMPORTANT: Always reset form values first before populating
        if (startTimestamp) {
          const [date, time] = startTimestamp.split(' ');
          if (date && time) {
            dpolForm.value.startDate = date;
            dpolForm.value.startTime = time;
            console.log('✅ [DPOL] Set start date/time:', { date, time });
          }
        } else {
          dpolForm.value.startDate = '';
          dpolForm.value.startTime = '';
          console.log('⚠️ [DPOL] No start timestamp found, clearing start date/time');
        }
        
        if (stopTimestamp) {
          const [date, time] = stopTimestamp.split(' ');
          if (date && time) {
            dpolForm.value.endDate = date;
            dpolForm.value.endTime = time;
            console.log('✅ [DPOL] Set end date/time:', { date, time });
          }
        } else {
          dpolForm.value.endDate = '';
          dpolForm.value.endTime = '';
          console.log('⚠️ [DPOL] No stop timestamp found, clearing end date/time');
        }
        
        // Populate Depolarization interval if available
        if (params['Depolarization_interval']) {
          dpolForm.value.interval = params['Depolarization_interval'];
          console.log('✅ [DPOL] Set interval from Depolarization_interval:', params['Depolarization_interval']);
        } else if (settingsCache && settingsCache.getStagedSummary().changes['Depolarization_interval']) {
          // Fallback to cached value if available
          const cachedInterval = settingsCache.getStagedSummary().changes['Depolarization_interval'];
          dpolForm.value.interval = cachedInterval;
          console.log('✅ [DPOL] Set interval from cache:', cachedInterval);
        } else {
          dpolForm.value.interval = '00:00:05';
          console.log('⚠️ [DPOL] Depolarization_interval not found. Available keys:', Object.keys(params));
        }
        
        console.log('✅ [DPOL] Form population complete:', {
          startDate: dpolForm.value.startDate,
          startTime: dpolForm.value.startTime,
          endDate: dpolForm.value.endDate,
          endTime: dpolForm.value.endTime,
          interval: dpolForm.value.interval
        });
        
        // DPOL form populated successfully
      } else {
        console.warn('⚠️ [DPOL] No device settings available');
      }
    };

    // Helper function to populate INST form from device settings
    const populateInstFormFromSettings = () => {
      console.log('🔍 DEBUG: populateInstFormFromSettings called');
      console.log('🔍 DEBUG: deviceSettings.value:', deviceSettings.value);
      
      if (deviceSettings.value?.Parameters) {
        const params = deviceSettings.value.Parameters;
        console.log('🔍 DEBUG: Available parameters:', Object.keys(params));
        console.log('🔍 DEBUG: Instant Mode value:', params['Instant Mode']);
        // Try both display format and camelCase format for timestamps
        const startTime = params['Instant Start TimeStamp'] || params['instantStartTimestamp'];
        console.log('🔍 DEBUG: Start time value:', startTime);
        
        // Populate INST mode settings if available
        if (params['Instant Mode'] !== undefined) {
          instForm.value.frequency = params['Instant Mode'] === 0 ? 'daily' : 'weekly';
          console.log('🔍 DEBUG: Set frequency to:', instForm.value.frequency);
        }
        if (startTime) {
          instForm.value.startTime = startTime;
          console.log('🔍 DEBUG: Set startTime to:', instForm.value.startTime);
        }
        
        console.log('🔍 DEBUG: Final instForm values:', {
          frequency: instForm.value.frequency,
          startTime: instForm.value.startTime
        });
      } else {
        console.log('⚠️ DEBUG: No device settings available');
      }
    };

    const alarmSetopForm = ref({
      value: '0.00',
      unit: ''
    });

    const alarmReffcalForm = ref({
      value: '0.00',
      unit: ''
    });

    // Shunt configuration forms
    const shuntVoltageForm = ref({
      value: '25.00'
    });
    
    const shuntCurrentForm = ref({
      value: '99.99'
    });



    // Functions to open modals
    const openLogModal = () => {
      showLogModal.value = true;
    };

    const openModeModal = () => {
      showModeModal.value = true;
    };



    const openElectrodeModal = () => {
      // Load current electrode from device settings
      const currentElectrode = settingsParams.value?.['Electrode'];
      if (currentElectrode !== undefined && currentElectrode !== null) {
        // The value might be stored as a code (0, 1, 2) or as a string
        // We need to find the key that matches this code
        let selectedValue = '';
        
        if (typeof currentElectrode === 'number') {
          // If it's a code, find the corresponding electrode type
          for (const [key, code] of Object.entries(ELECTRODE_MAPPING)) {
            if (code === currentElectrode) {
              selectedValue = key;
              break;
            }
          }
        } else {
          // If it's already a string, use it directly
          selectedValue = currentElectrode;
        }
        
        selectedElectrode.value = selectedValue;
        console.log('📋 [ELECTRODE] Current electrode loaded:', selectedValue);
      } else {
        selectedElectrode.value = '';
      }
      
      showElectrodeModal.value = true;
    };

    const openAlarmModal = () => {
      // Populate all alarm forms with current device settings when opening main alarm modal
      const setupValue = settingsParams.value?.['Reference UP'];
      if (setupValue !== undefined && setupValue !== null) {
        const formattedValue = parseFloat(setupValue).toFixed(2);
        alarmSetupForm.value.value = formattedValue;
      } else {
        alarmSetupForm.value.value = '0.00';
      }
      
      const setopValue = settingsParams.value?.['Reference OP'];
      if (setopValue !== undefined && setopValue !== null) {
        const formattedValue = parseFloat(setopValue).toFixed(2);
        alarmSetopForm.value.value = formattedValue;
      } else {
        alarmSetopForm.value.value = '0.00';
      }
      
      const reffcalValue = settingsParams.value?.['Reference Fail'];
      if (reffcalValue !== undefined && reffcalValue !== null) {
        const formattedValue = formatVoltageValue(reffcalValue, 2);
        alarmReffcalForm.value.value = formattedValue;
      } else {
        alarmReffcalForm.value.value = '0.00';
      }
      
      console.log('🔍 Alarm modal opened with values:', {
        setup: alarmSetupForm.value.value,
        setop: alarmSetopForm.value.value,
        reffcal: alarmReffcalForm.value.value
      });
      
      showAlarmModal.value = true;
    };

    // Functions to open alarm item modals
    const openAlarmItemModal = (type: string) => {
      showAlarmModal.value = false;
      
      // Open modals and populate from previous settings
      if (type === 'setup') {
        // Populate from current settings
        const setupValue = settingsParams.value?.['Reference UP'];
        if (setupValue !== undefined && setupValue !== null) {
          const formattedValue = formatVoltageValue(setupValue);
          alarmSetupForm.value.value = formattedValue;
        } else {
          alarmSetupForm.value.value = '0.00';
        }
        showAlarmSetupModal.value = true;
      } else if (type === 'setop') {
        // Populate from current settings
        const setopValue = settingsParams.value?.['Reference OP'];
        if (setopValue !== undefined && setopValue !== null) {
          const formattedValue = formatVoltageValue(setopValue);
          alarmSetopForm.value.value = formattedValue;
        } else {
          alarmSetopForm.value.value = '0.00';
        }
        showAlarmSetopModal.value = true;
      } else if (type === 'reffcal') {
        const currentValue = settingsParams.value?.['Reference Fail'];
        if (currentValue !== undefined && currentValue !== null) {
          const formattedValue = formatVoltageValue(currentValue, 2);
          alarmReffcalForm.value.value = formattedValue;
        } else {
          alarmReffcalForm.value.value = '0.00';
        }
        showAlarmReffcalModal.value = true;
      }
    };

    // Functions to open mode sub-modals
    const openNormalModal = () => {
      showModeModal.value = false;
      showNormalModal.value = true;
    };

    const openAutoModal = () => {
      showModeModal.value = false;
      
      // CRITICAL: Always populate form with current device settings when opening modal
      // This ensures data persists even after page refresh
      populateAutoFormFromSettings();
      
      // Show modal with a small delay to ensure reactivity updates
      nextTick(() => {
        showAutoModal.value = true;
        // Modal opened with populated values
      });
    };

    const openManualModal = () => {
      showModeModal.value = false;
      
      // Always populate form with current device settings when opening modal
      populateAutoFormFromSettings(); // Reuse same function as Manual uses same timer fields
      
      // Show modal with a small delay to ensure reactivity updates
      nextTick(() => {
        showManualModal.value = true;
        console.log('🔍 MANUAL modal opened with timer values:', {
          onSeconds: onSeconds.value,
          offSeconds: offSeconds.value
        });
      });
    };

    const openDpolModal = () => {
      showModeModal.value = false;
      
      // Always populate form with current device settings when opening modal
      populateDpolFormFromSettings();
      
      // Show modal with a small delay to ensure reactivity updates
      nextTick(() => {
        showDpolModal.value = true;
        console.log('🔄 [DPOL] Modal opened with form values:', {
          startDate: dpolForm.value.startDate,
          startTime: dpolForm.value.startTime,
          endDate: dpolForm.value.endDate,
          endTime: dpolForm.value.endTime,
          interval: dpolForm.value.interval
        });
      });
    };

    const openInstModal = () => {
      showModeModal.value = false;
      
      // Always populate form with current device settings when opening modal
      populateInstFormFromSettings();
      
      showInstModal.value = true;
    };

    // Functions to close modals
    const closeLogModal = () => {
      showLogModal.value = false;
    };

    // Logging interval functions
    const setLoggingInterval = (interval: string) => {
      // Auto-shift 00:00:00 to minimum meaningful interval
      if (interval === '00:00:00') {
        loggingInterval.value = '00:01:00';
      } else {
        loggingInterval.value = interval;
      }
    };

    const isValidTimeFormat = (time: string) => {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(time)) return false;
      
      // Check if it's 00:00:00 (zero interval)
      const [hours, minutes, seconds] = time.split(':').map(Number);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      
      // Reject zero intervals as they disable logging
      return totalSeconds > 0;
    };

    const formatIntervalDescription = (interval: string) => {
      if (!isValidTimeFormat(interval)) return 'Invalid format';
      
      const [hours, minutes, seconds] = interval.split(':').map(Number);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      
      if (totalSeconds === 0) return 'No logging';
      if (totalSeconds < 60) return `Every ${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`;
      if (totalSeconds < 3600) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return secs > 0 ? `Every ${mins}m ${secs}s` : `Every ${mins} minute${mins !== 1 ? 's' : ''}`;
      }
      
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      
      let desc = `Every ${hrs} hour${hrs !== 1 ? 's' : ''}`;
      if (mins > 0) desc += ` ${mins}m`;
      if (secs > 0) desc += ` ${secs}s`;
      
      return desc;
    };

    const saveLoggingInterval = async () => {
      // Auto-shift 00:00:00 to minimum interval
      if (loggingInterval.value === '00:00:00') {
        loggingInterval.value = '00:01:00';
        Swal.fire({
          title: 'Interval Adjusted',
          text: 'Logging interval cannot be 00:00:00 (no logging). Automatically adjusted to 00:01:00 (1 minute).',
          icon: 'info',
          confirmButtonText: 'Continue'
        });
        return;
      }

      if (!isValidTimeFormat(loggingInterval.value)) {
        const [hours, minutes, seconds] = loggingInterval.value.split(':').map(Number);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        if (totalSeconds === 0) {
          Swal.fire({
            title: 'Invalid Interval',
            text: 'Logging interval cannot be 00:00:00 as it disables data logging. Please set a minimum interval of 00:00:01.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
        } else {
          Swal.fire({
            title: 'Invalid Format',
            text: 'Please enter a valid time format (HH:MM:SS)',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
        return;
      }

      try {
        const cache = getSettingsCache();
        if (!cache) {
          throw new Error('Settings cache not initialized');
        }

        console.log('📝 [CACHE] Staging logging interval:', loggingInterval.value);
        
        // Transform data and stage
        const payload = dataTransformer.loggingIntervalToPayload(loggingInterval.value);
        console.log('📦 [CACHE] Payload to stage:', JSON.stringify(payload));
        cache.stageBatchUpdates(payload);
        
        // Update UI to show pending changes
        updatePendingChangesDisplay();

        await Swal.fire({
          title: 'Logging Interval Staged!',
          html: `<div class="text-start">
            <p><strong>${loggingInterval.value}</strong> (${formatIntervalDescription(loggingInterval.value)})</p>
            <p class="mt-2 mb-0"><em class="text-warning">⏳ Changes are pending. Click "Apply All Changes" to send to device.</em></p>
          </div>`,
          icon: 'info',
          confirmButtonText: 'OK'
        });

        closeLogModal();
        
      } catch (error) {
        console.error('❌ [LOG INTERVAL] Error:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to stage logging interval. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    const closeModeModal = () => {
      showModeModal.value = false;
    };



    const closeElectrodeModal = () => {
      showElectrodeModal.value = false;
    };

    const closeAlarmModal = () => {
      showAlarmModal.value = false;
    };

    // Functions to close alarm item modals
    const closeAlarmSetupModal = () => {
      showAlarmSetupModal.value = false;
      showAlarmModal.value = true; // Return to main alarm modal
    };

    const saveAlarmSetupModal = async () => {
      try {
        // Parse SET UP value
        let setupValue = parseFloat(alarmSetupForm.value.value);
        if (isNaN(setupValue)) {
          await Swal.fire({
            title: 'Validation Error',
            text: 'SET UP value must be a valid number',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          return;
        }
        
        // Get electrode-specific limits
        const limits = getSetUpLimits();
        
        // Validate against electrode-specific range
        if (setupValue < limits.min || setupValue > limits.max) {
          await Swal.fire({
            title: 'Validation Error',
            text: `SET UP value must be between ${limits.min} and ${limits.max}V (${setUpRangeText.value})`,
            icon: 'error',
            confirmButtonText: 'OK'
          });
          return;
        }

        console.log('📝 [CACHE] Staging SET UP configuration:', setupValue);
        console.log(`   Value: ${setupValue} (Range: ${limits.min} to ${limits.max})`);
        
        // Stage Reference UP parameter via caching system
        stageSettingUpdate('Reference UP', setupValue);
        
        updatePendingChangesDisplay();

        await Swal.fire({
          title: 'SET UP Staged!',
          text: `SET UP set to ${setupValue.toFixed(2)}V\n\nClick "Apply All Settings" to send to device.`,
          icon: 'success',
          confirmButtonText: 'OK'
        });
        showAlarmSetupModal.value = false;
        showAlarmModal.value = false;
      } catch (error: any) {
        console.error('❌ Error staging SET UP:', error);
        await Swal.fire({
          title: 'Configuration Failed',
          text: error.message || 'Failed to stage SET UP. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    const closeAlarmSetopModal = () => {
      showAlarmSetopModal.value = false;
      showAlarmModal.value = true; // Return to main alarm modal
    };

    const saveAlarmSetopModal = async () => {
      try {
        // Parse SET OP value
        let setopValue = parseFloat(alarmSetopForm.value.value);
        if (isNaN(setopValue)) {
          await Swal.fire({
            title: 'Validation Error',
            text: 'SET OP value must be a valid number',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          return;
        }
        
        // Get electrode-specific limits
        const limits = getSetOpLimits();
        
        // Validate against electrode-specific range
        if (setopValue < limits.min || setopValue > limits.max) {
          await Swal.fire({
            title: 'Validation Error',
            text: `SET OP value must be between ${limits.min} and ${limits.max}V (${setOpRangeText.value})`,
            icon: 'error',
            confirmButtonText: 'OK'
          });
          return;
        }

        console.log('📝 [CACHE] Staging SET OP configuration:', setopValue);
        console.log(`   Value: ${setopValue} (Range: ${limits.min} to ${limits.max})`);
        
        // Stage Reference OP parameter via caching system
        stageSettingUpdate('Reference OP', setopValue);
        
        updatePendingChangesDisplay();

        await Swal.fire({
          title: 'SET OP Staged!',
          text: `SET OP set to ${setopValue.toFixed(2)}V\n\nClick "Apply All Settings" to send to device.`,
          icon: 'success',
          confirmButtonText: 'OK'
        });
        showAlarmSetopModal.value = false;
        showAlarmModal.value = false;
      } catch (error: any) {
        console.error('❌ Error staging SET OP:', error);
        await Swal.fire({
          title: 'Configuration Failed',
          text: error.message || 'Failed to stage SET OP. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    const validateRefFcalInput = (event: any) => {
      const value = parseFloat(event.target.value);
      if (!isNaN(value)) {
        if (value < -4.0) {
          alarmReffcalForm.value.value = '-4.00';
        } else if (value > 4.0) {
          alarmReffcalForm.value.value = '4.00';
        } else {
          alarmReffcalForm.value.value = value.toFixed(2);
        }
      }
    };

    const closeAlarmReffcalModal = () => {
      showAlarmReffcalModal.value = false;
      showAlarmModal.value = true; // Return to main alarm modal
    };

    // NOTE: saveAlarmReffcalModal is no longer used - Reference Fail is now read-only
    // and automatically calculated based on the electrode type
    /*
    const saveAlarmReffcalModal = async () => {
      try {
        // Validate Reference Fail value
        const reffcalValue = parseFloat(alarmReffcalForm.value.value);
        if (isNaN(reffcalValue) || reffcalValue < -4.0 || reffcalValue > 4.0) {
          await Swal.fire({
            title: 'Validation Error',
            text: 'Reference Fail value must be between -4.0 and 4.0V',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          return;
        }

        // Only send the changed value - backend will preserve others from database
        console.log('💾 Saving Reference Fail independently:', reffcalValue);

        const config = {
          reffcal: { value: reffcalValue }
        };

        const response = await mqttService.setAlarmConfiguration(deviceId.value || '123', config);
        
        if (response.success) {
          // Save settings to database after successful send
          try {
            await mqttService.saveSettingsToDatabase(deviceId.value || '123', {
              referenceFail: reffcalValue
            });
            console.log('✅ Reference Fail setting saved to database');
          } catch (dbError) {
            console.warn('⚠️ Database save failed (non-critical):', dbError);
          }

          await Swal.fire({
            title: 'Reference Fail Configured!',
            text: `Reference Fail set to ${reffcalValue.toFixed(1)}V`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          await refreshDeviceSettings();
          showAlarmReffcalModal.value = false;
          showAlarmModal.value = false;
        } else {
          throw new Error(response.message || 'Configuration failed');
        }
      } catch (error: any) {
        console.error('❌ Error saving Reference Fail:', error);
        await Swal.fire({
          title: 'Configuration Failed',
          text: error.message || 'Failed to save Reference Fail. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };
    */

    // Functions for shunt configuration modals
    const openShuntVoltageModal = () => {
      const currentValue = settingsParams.value?.['Shunt Voltage'];
      if (currentValue) {
        // Convert to string and extract numeric part
        const strValue = currentValue.toString().trim();
        // Try to match one of the dropdown values
        const numValue = parseFloat(strValue);
        const roundedValue = Math.round(numValue);
        
        // Set to closest valid option or default to 25
        if ([25, 50, 75, 100].includes(roundedValue)) {
          shuntVoltageForm.value.value = String(roundedValue).padStart(3, '0');
        } else {
          shuntVoltageForm.value.value = '025';
        }
      } else {
        shuntVoltageForm.value.value = '025';
      }
      showShuntVoltageModal.value = true;
    };

    const closeShuntVoltageModal = () => {
      showShuntVoltageModal.value = false;
    };

    const saveShuntVoltage = async () => {
      await saveShuntVoltageConfiguration();
    };

    const openShuntCurrentModal = () => {
      // Try to get from current settings first, then fallback to cache
      let currentValue = settingsParams.value?.['Shunt Current'];
      
      // If not in current settings, check the cache
      if (!currentValue && settingsCache) {
        const staged = settingsCache.getStagedSummary();
        if (staged.changes['Shunt Current']) {
          currentValue = staged.changes['Shunt Current'];
        }
      }
      
      if (currentValue !== undefined && currentValue !== null) {
        // Format using the display function to ensure proper resolution conversion
        const displayValue = formatShuntCurrentDisplay(currentValue);
        // Remove the " A" suffix for the form value
        const numValue = parseFloat(displayValue);
        if (!isNaN(numValue)) {
          shuntCurrentForm.value.value = numValue.toFixed(1).padStart(4, '0');
        } else {
          shuntCurrentForm.value.value = '99.9';
        }
      } else {
        shuntCurrentForm.value.value = '99.9';
      }
      
      console.log('📊 [SHUNT] Opened modal with current value:', currentValue, 'formatted:', shuntCurrentForm.value.value);
      showShuntCurrentModal.value = true;
    };

    const closeShuntCurrentModal = () => {
      showShuntCurrentModal.value = false;
    };

    // Functions to close mode sub-modals and return to main mode modal
    const closeNormalModal = () => {
      showNormalModal.value = false;
    };

    const closeAutoModal = () => {
      showAutoModal.value = false;
    };

    const closeSetNoModal = () => {
      showSetNoModal.value = false;
    };

    const saveTimerConfiguration = async () => {
      try {
        savingConfiguration.value = true;

        // Create config object from form data
        const config = {
          setno: {
            ton: {
              field1: setNoForm.value.ton.field1,
              field2: setNoForm.value.ton.field2,
              field3: setNoForm.value.ton.field3,
              field4: setNoForm.value.ton.field4,
              field5: setNoForm.value.ton.field5,
              field6: setNoForm.value.ton.field6
            },
            toff: {
              field1: setNoForm.value.toff.field1,
              field2: setNoForm.value.toff.field2,
              field3: setNoForm.value.toff.field3,
              field4: setNoForm.value.toff.field4,
              field5: setNoForm.value.toff.field5,
              field6: setNoForm.value.toff.field6
            }
          }
        };

        console.log('💾 Saving SET NO Timer Configuration:', config);
        
        // Here you would send the config to your backend/MQTT service
        // const response = await mqttService.setTimerConfiguration(deviceId.value || '123', config);

        await Swal.fire({
          title: 'Success',
          text: 'SET NO Timer Configuration saved successfully!',
          icon: 'success',
          confirmButtonText: 'OK'
        });

        closeSetNoModal();
      } catch (error: any) {
        console.error('❌ Error saving timer configuration:', error);
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Failed to save timer configuration',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      } finally {
        savingConfiguration.value = false;
      }
    };

    const saveInterruptModeConfiguration = async () => {
      try {
        if (!deviceId.value) {
          throw new Error('Device ID is required');
        }

        // Validate required fields
        if (!autoForm.value.startDate || !autoForm.value.startTime || 
            !autoForm.value.stopDate || !autoForm.value.stopTime ||
            !autoForm.value.onTime || !autoForm.value.offTime) {
          await Swal.fire({
            title: 'Validation Error',
            text: 'Please fill in all required fields including start/stop date/time and on/off time settings.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          return;
        }

        // Prepare configuration data
        const config = {
          startDate: autoForm.value.startDate,
          startTime: autoForm.value.startTime,
          stopDate: autoForm.value.stopDate,
          stopTime: autoForm.value.stopTime,
          onTime: parseFloat(autoForm.value.onTime.toString()),
          offTime: parseFloat(autoForm.value.offTime.toString())
        };

        console.log('📝 [CACHE] Staging Interrupt Mode configuration:', config);
        
        // Stage Event parameter (1 = Interrupt)
        stageSettingUpdate('Event', 1);
        stageSettingUpdate('Interrupt Start TimeStamp', `${config.startDate} ${config.startTime}`);
        stageSettingUpdate('Interrupt Stop TimeStamp', `${config.stopDate} ${config.stopTime}`);
        stageSettingUpdate('Interrupt ON Time', config.onTime);
        stageSettingUpdate('Interrupt OFF Time', config.offTime);
        
        await Swal.fire({
          title: 'Interrupt Mode Staged!',
          text: 'Interrupt mode configuration staged.\n\nClick "Apply All Settings" to send to device.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        
        closeAutoModal();
        showModeModal.value = false;

      } catch (error: any) {
        console.error('Error staging interrupt mode configuration:', error);
        
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Failed to stage interrupt mode configuration',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    const closeManualModal = () => {
      showManualModal.value = false;
    };

    const closeDpolModal = () => {
      showDpolModal.value = false;
    };

    const closeInstModal = () => {
      showInstModal.value = false;
    };

    // Functions to go back to main mode modal
    const backToModeModal = () => {
      showNormalModal.value = false;
      showAutoModal.value = false;
      showManualModal.value = false;
      showDpolModal.value = false;
      showInstModal.value = false;
      showAlarmModal.value = false;
      showModeModal.value = true;
    };

    // Save shunt configuration functions (now using cache)
    const saveShuntVoltageConfiguration = async () => {
      try {
        if (!deviceId.value) {
          throw new Error('Device ID is required');
        }

        const voltage = shuntVoltageForm.value.value;
        const paddedVoltage = String(voltage).padStart(3, '0');
        
        console.log('📝 [CACHE] Staging Shunt Voltage configuration:', paddedVoltage);
        stageSettingUpdate('Shunt Voltage', paddedVoltage);
        
        updatePendingChangesDisplay();
        
        await Swal.fire({
          icon: 'success',
          title: 'Shunt Voltage Staged!',
          text: `Shunt voltage set to ${paddedVoltage} mV.\n\nClick "Apply All Settings" to send to device.`,
          showConfirmButton: false,
          timer: 2000
        });
        
        closeShuntVoltageModal();
      } catch (error: any) {
        console.error('❌ Error staging Shunt Voltage:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to stage voltage configuration'
        });
      }
    };

    const saveShuntCurrentConfiguration = async () => {
      try {
        if (!deviceId.value) {
          throw new Error('Device ID is required');
        }

        const current = parseFloat(shuntCurrentForm.value.value);
        if (isNaN(current) || current < 0.0 || current > 99.9) {
          throw new Error('Current must be between 00.0 and 99.9');
        }

        // Convert to integer format: multiply by 10 (23.7 → 237)
        const integerFormat = Math.round(current * 10);
        console.log('📝 [CACHE] Staging Shunt Current configuration:', current, '→', integerFormat);
        stageSettingUpdate('Shunt Current', integerFormat);
        
        updatePendingChangesDisplay();
        
        await Swal.fire({
          icon: 'success',
          title: 'Shunt Current Staged!',
          text: `Shunt current set to ${current.toFixed(1)}A.\n\nClick "Apply All Settings" to send to device.`,
          showConfirmButton: false,
          timer: 2000
        });
        
        closeShuntCurrentModal();
      } catch (error: any) {
        console.error('❌ Error staging Shunt Current:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to stage current configuration'
        });
      }
    };

    // Function to close all modals
    // Input validation methods
    const validateVoltageInput = (event: any) => {
      const value = event.target.value;
      // Remove any characters that aren't digits or decimal point
      const cleaned = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        event.target.value = parts[0] + '.' + parts.slice(1).join('');
      }
      // Limit to 1 decimal place
      if (parts[1] && parts[1].length > 1) {
        event.target.value = parts[0] + '.' + parts[1].substring(0, 1);
      }
      shuntVoltageForm.value.value = event.target.value;
    };

    const formatVoltageInput = (event: any) => {
      const value = parseFloat(event.target.value);
      if (!isNaN(value)) {
        const clamped = Math.min(Math.max(value, 0), 99.9);
        const formatted = clamped.toFixed(1).padStart(4, '0');
        event.target.value = formatted;
        shuntVoltageForm.value.value = formatted;
      }
    };

    const validateCurrentInput = (event: any) => {
      let value = event.target.value.replace(/[^\d.]/g, '');
      
      // Remove multiple decimal points
      const cleaned = value.replace(/\.+/g, '.');
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
      
      // Auto-add decimal after 2 digits if not present
      if (!value.includes('.') && value.length >= 2) {
        value = value.substring(0, 2) + '.' + value.substring(2);
      }
      
      // Limit to 1 decimal place
      if (parts[1] && parts[1].length > 1) {
        value = parts[0] + '.' + parts[1].substring(0, 1);
      }
      
      // Limit total length to 4 chars (00.0)
      if (value.length > 4) {
        value = value.substring(0, 4);
      }
      
      event.target.value = value;
      shuntCurrentForm.value.value = value;
      console.log('📝 [SHUNT] Input value:', value, 'parsed:', parseFloat(value));
    };

    const formatCurrentInput = (event: any) => {
      let value = event.target.value.trim();
      if (value === '' || value === '.') {
        value = '00.0';
      } else {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          const clamped = Math.min(Math.max(num, 0), 99.9);
          value = clamped.toFixed(1).padStart(4, '0');
        }
      }
      event.target.value = value;
      shuntCurrentForm.value.value = value;
      console.log('📝 [SHUNT] Formatted value:', value, 'parsed:', parseFloat(value));
    };

    // Input handlers for Set UP/OP (0.00 format - 2 decimal places exactly)
    const handleSetupInput = (event: any) => {
      let value = event.target.value;
      
      // Only allow digits, minus sign, and decimal point
      let cleanedValue = value.replace(/[^\d.-]/g, '');
      
      // Handle minus sign (only at the beginning)
      if (cleanedValue.includes('-')) {
        const minusIndex = cleanedValue.indexOf('-');
        if (minusIndex > 0) {
          cleanedValue = '-' + cleanedValue.replace(/-/g, '');
        } else if (minusIndex === 0 && cleanedValue.length > 1 && cleanedValue[1] === '.') {
          // Valid: "-." format
        } else if (minusIndex > 0 || cleanedValue.lastIndexOf('-') !== minusIndex) {
          // Remove extra minus signs
          cleanedValue = cleanedValue.replace(/-/g, '');
          if (value[0] === '-') cleanedValue = '-' + cleanedValue;
        }
      }
      
      // Remove multiple decimal points, keep only the first
      const parts = cleanedValue.split('.');
      if (parts.length > 2) {
        cleanedValue = (parts[0] || '') + '.' + (parts[1] || '');
      }
      
      // Auto-insert decimal point after first digit
      if (cleanedValue && !cleanedValue.includes('.')) {
        if (cleanedValue === '-') {
          // Allow "-" as user might type "-0"
        } else if (cleanedValue.length >= 2) {
          // If 2+ digits without decimal, auto-insert after first digit (or after minus)
          const hasNegative = cleanedValue[0] === '-';
          const digitsOnly = hasNegative ? cleanedValue.slice(1) : cleanedValue;
          
          if (digitsOnly.length >= 1) {
            cleanedValue = (hasNegative ? '-' : '') + digitsOnly[0] + '.' + digitsOnly.slice(1);
          }
        }
      }
      
      // Limit to 2 decimal places
      if (cleanedValue.includes('.')) {
        const [intPart, decimalPart] = cleanedValue.split('.');
        if (decimalPart && decimalPart.length > 2) {
          cleanedValue = intPart + '.' + decimalPart.substring(0, 2);
        }
      }
      
      // Limit total length (max: "-4.00" = 5 chars)
      if (cleanedValue.length > 5) {
        cleanedValue = cleanedValue.substring(0, 5);
      }
      
      event.target.value = cleanedValue;
      alarmSetupForm.value.value = cleanedValue;
    };

    const formatSetupInput = (event: any) => {
      let value = event.target.value.trim();
      if (value === '' || value === '-' || value === '-.') {
        value = '0.00';
      } else {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          const clamped = Math.min(Math.max(num, -4.0), 4.0);
          value = clamped.toFixed(2);
        } else {
          value = '0.00';
        }
      }
      event.target.value = value;
      alarmSetupForm.value.value = value;
    };

    const handleSetopInput = (event: any) => {
      let value = event.target.value;
      
      // Only allow digits, minus sign, and decimal point
      let cleanedValue = value.replace(/[^\d.-]/g, '');
      
      // Handle minus sign (only at the beginning)
      if (cleanedValue.includes('-')) {
        const minusIndex = cleanedValue.indexOf('-');
        if (minusIndex > 0) {
          cleanedValue = '-' + cleanedValue.replace(/-/g, '');
        } else if (minusIndex === 0 && cleanedValue.length > 1 && cleanedValue[1] === '.') {
          // Valid: "-." format
        } else if (minusIndex > 0 || cleanedValue.lastIndexOf('-') !== minusIndex) {
          // Remove extra minus signs
          cleanedValue = cleanedValue.replace(/-/g, '');
          if (value[0] === '-') cleanedValue = '-' + cleanedValue;
        }
      }
      
      // Remove multiple decimal points, keep only the first
      const parts = cleanedValue.split('.');
      if (parts.length > 2) {
        cleanedValue = (parts[0] || '') + '.' + (parts[1] || '');
      }
      
      // Auto-insert decimal point after first digit
      if (cleanedValue && !cleanedValue.includes('.')) {
        if (cleanedValue === '-') {
          // Allow "-" as user might type "-0"
        } else if (cleanedValue.length >= 2) {
          // If 2+ digits without decimal, auto-insert after first digit (or after minus)
          const hasNegative = cleanedValue[0] === '-';
          const digitsOnly = hasNegative ? cleanedValue.slice(1) : cleanedValue;
          
          if (digitsOnly.length >= 1) {
            cleanedValue = (hasNegative ? '-' : '') + digitsOnly[0] + '.' + digitsOnly.slice(1);
          }
        }
      }
      
      // Limit to 2 decimal places
      if (cleanedValue.includes('.')) {
        const [intPart, decimalPart] = cleanedValue.split('.');
        if (decimalPart && decimalPart.length > 2) {
          cleanedValue = intPart + '.' + decimalPart.substring(0, 2);
        }
      }
      
      // Limit total length (max: "-4.00" = 5 chars)
      if (cleanedValue.length > 5) {
        cleanedValue = cleanedValue.substring(0, 5);
      }
      
      event.target.value = cleanedValue;
      alarmSetopForm.value.value = cleanedValue;
    };

    const formatSetopInput = (event: any) => {
      let value = event.target.value.trim();
      if (value === '' || value === '-' || value === '-.') {
        value = '0.00';
      } else {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          const clamped = Math.min(Math.max(num, -4.0), 4.0);
          value = clamped.toFixed(2);
        } else {
          value = '0.00';
        }
      }
      event.target.value = value;
      alarmSetopForm.value.value = value;
    };

    // Display formatting functions for device settings matrix
    const formatShuntVoltageDisplay = (voltage: any) => {
      if (!voltage && voltage !== 0) return '25.0 V';
      if (typeof voltage === 'string') {
        return `${voltage} V`;
      }
      return `${parseFloat(voltage).toFixed(1).padStart(4, '0')} V`;
    };

    const formatShuntCurrentDisplay = (current: any) => {
      if (!current && current !== 0) return '9.9 A';
      let numValue = parseFloat(current);
      if (isNaN(numValue)) return '9.9 A';
      
      // Shunt current can be in two formats:
      // 1. Integer format from cache/staged changes: 999 (means 99.9A) - needs /10
      // 2. Decimal format from database: "99.9" - no conversion needed
      // Distinguish by checking if value >= 100 (integer format) or < 100 (decimal format)
      if (numValue >= 100) {
        numValue = numValue / 10;
      }
      
      return `${numValue.toFixed(1)} A`;
    };

    const closeAllModals = () => {
      showLogModal.value = false;
      showModeModal.value = false;

      showElectrodeModal.value = false;
      showNormalModal.value = false;
      showAutoModal.value = false;
      showManualModal.value = false;
      showDpolModal.value = false;
      showInstModal.value = false;
      showAlarmModal.value = false;
      showAlarmSetupModal.value = false;
      showAlarmSetopModal.value = false;
      showAlarmReffcalModal.value = false;
      showShuntVoltageModal.value = false;
      showShuntCurrentModal.value = false;
    };

    // Get default Reference Fail value based on electrode type
    const getDefaultReferenceFail = (electrodeType: string): number => {
      switch (electrodeType) {
        case 'Zinc':
          return -0.80;  // Zinc electrode
        case 'Cu/cuso4':
        case 'CuCuSO4':
        case 'Ag/AgCl':
        case 'AgAgSO4':
        default:
          return 0.30;   // Cu/CuSO4 and Ag/AgCl electrodes
      }
    };

    // Save electrode configuration
    const saveElectrodeConfiguration = async () => {
      try {
        if (!selectedElectrode.value) {
          await Swal.fire({
            title: 'Selection Required',
            text: 'Please select an electrode type.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return;
        }

        const electrodeCode = ELECTRODE_MAPPING[selectedElectrode.value] || 0;
        const defaultRefFail = getDefaultReferenceFail(selectedElectrode.value);
        
        console.log('📝 [CACHE] Staging electrode configuration:', selectedElectrode.value);
        
        // Stage the electrode update
        stageSettingUpdate('Electrode', electrodeCode);
        // Auto-set Reference Fail with electrode
        stageSettingUpdate('Reference Fail', defaultRefFail);
        
        // Update UI to show pending changes
        updatePendingChangesDisplay();
        
        await Swal.fire({
          title: 'Electrode Configuration Staged!',
          text: `${selectedElectrode.value} electrode staged (auto-set Reference Fail to ${defaultRefFail.toFixed(2)}V).\n\nClick "Apply All Settings" to send to device.`,
          icon: 'success',
          confirmButtonText: 'OK'
        });
        
        closeElectrodeModal();
      } catch (error: any) {
        console.error('Error staging electrode:', error);
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Failed to stage electrode configuration',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    // Save manual mode action
    const executeManualAction = async (action: 'start' | 'stop') => {
      try {
        if (!deviceId.value) {
          throw new Error('Device ID is required');
        }

        console.log('📝 [CACHE] Staging Manual Mode Action:', action);
        console.log('📊 Current Timer Values - ON:', autoForm.value.onTime, 'OFF:', autoForm.value.offTime);
        
        // Stage Event parameter (2 = Manual)
        const actionCode = MANUAL_ACTION_MAPPING[action] || 0;
        stageSettingUpdate('Event', 2);
        stageSettingUpdate('Manual Mode Action', actionCode);
        stageSettingUpdate('Interrupt ON Time', autoForm.value.onTime);
        stageSettingUpdate('Interrupt OFF Time', autoForm.value.offTime);
        
        await Swal.fire({
          title: `Manual ${action.toUpperCase()} Staged!`,
          text: `Manual ${action} action staged with timer settings.\n\nClick "Apply All Settings" to send to device.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        
      } catch (error: any) {
        console.error('❌ Error staging manual action:', error);
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Failed to stage manual action',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    // Save normal mode configuration
    const saveNormalModeConfiguration = async () => {
      try {
        if (!deviceId.value) {
          throw new Error('Device ID is required');
        }

        console.log('📝 [CACHE] Staging Normal Mode configuration');
        
        // Stage Event parameter (0 = Normal)
        stageSettingUpdate('Event', 0);
        
        await Swal.fire({
          title: 'Normal Mode Staged!',
          text: 'Normal mode configuration staged.\n\nClick "Apply All Settings" to send to device.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        
        closeNormalModal();
        showModeModal.value = false;
      } catch (error: any) {
        console.error('Error staging normal mode:', error);
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Failed to stage normal mode configuration',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    // Save DPOL mode configuration
    const saveDpolModeConfiguration = async () => {
      try {
        if (!deviceId.value) {
          throw new Error('Device ID is required');
        }

        const config = {
          startDate: dpolForm.value.startDate,
          startTime: dpolForm.value.startTime,
          endDate: dpolForm.value.endDate,
          endTime: dpolForm.value.endTime,
          interval: dpolForm.value.interval
        };

        console.log('📝 [CACHE] Staging DPOL Mode configuration:', config);
        
        // Convert YYYY-MM-DD to DD/MM/YY for display in cache
        const formatDateForDisplay = (dateStr: string) => {
          if (!dateStr) return '';
          const [year, month, day] = dateStr.split('-');
          const shortYear = year.substring(2); // Get last 2 digits of year
          return `${day}/${month}/${shortYear}`;
        };
        
        // Stage Event parameter (3 = DPOL)
        stageSettingUpdate('Event', 3);
        stageSettingUpdate('Depolarization Start TimeStamp', `${formatDateForDisplay(config.startDate)} ${config.startTime}`);
        stageSettingUpdate('Depolarization Stop TimeStamp', `${formatDateForDisplay(config.endDate)} ${config.endTime}`);
        stageSettingUpdate('Depolarization_interval', dpolForm.value.interval);
        
        await Swal.fire({
          title: 'DPOL Mode Staged!',
          text: 'DPOL mode configuration staged.\n\nClick "Apply All Settings" to send to device.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        
        closeDpolModal();
        showModeModal.value = false;
      } catch (error: any) {
        console.error('Error staging DPOL mode:', error);
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Failed to stage DPOL mode configuration',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    // Save INST mode configuration
    const saveInstModeConfiguration = async () => {
      try {
        if (!deviceId.value) {
          throw new Error('Device ID is required');
        }

        const config = {
          startTime: instForm.value.startTime,
          frequency: instForm.value.frequency
        };

        console.log('📝 [CACHE] Staging INST Mode configuration:', config);
        
        // Stage Event parameter (4 = INST)
        stageSettingUpdate('Event', 4);
        const frequencyCode = INSTANT_MODE_MAPPING[instForm.value.frequency] || 0;
        // Stage Instant Mode parameter (0 = daily, 1 = weekly)
        stageSettingUpdate('Instant Mode', frequencyCode);
        stageSettingUpdate('Instant Start TimeStamp', instForm.value.startTime);
        
        await Swal.fire({
          title: 'INST Mode Staged!',
          text: 'INST mode configuration staged.\n\nClick "Apply All Settings" to send to device.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        
        closeInstModal();
        showModeModal.value = false;
      } catch (error: any) {
        console.error('Error staging INST mode:', error);
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Failed to stage INST mode configuration',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    // Save set value configuration
    const saveAlarmConfiguration = async () => {
      try {
        if (!deviceId.value) {
          throw new Error('Device ID is required');
        }

        // Validate UP and OP values are between -4.0 to 4.0
        const validateRange = (value: string, name: string) => {
          const num = parseFloat(value);
          console.log(`🔍 Frontend validating ${name}: "${value}" → ${num} (isNaN: ${isNaN(num)})`);
          if (isNaN(num)) {
            throw new Error(`${name} must be a valid number`);
          }
          if (num < -4.00 || num > 4.00) {
            throw new Error(`${name} value must be between -4.0 and 4.0V`);
          }
          return num;
        };

        const setupValue = validateRange(alarmSetupForm.value.value, 'SET UP');
        const setopValue = validateRange(alarmSetopForm.value.value, 'SET OP');
        const reffcalValue = parseFloat(alarmReffcalForm.value.value);

        console.log('📝 [CACHE] Staging Alarm Configuration');
        
        // Stage the alarm configuration updates using frame parameter names
        stageSettingUpdate('Reference UP', setupValue);
        stageSettingUpdate('Reference OP', setopValue);
        stageSettingUpdate('Reference Fail', reffcalValue);
        
        await Swal.fire({
          title: 'Alarm Configuration Staged!',
          text: 'Alarm settings staged.\n\nClick "Apply All Settings" to send to device.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        
        closeAlarmModal();
      } catch (error: any) {
        console.error('Error staging alarm configuration:', error);
        await Swal.fire({
          title: 'Error',
          text: error.message || 'Failed to stage alarm configuration',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    return {
      displayedDevice,
      safeDevice,
      statusClass,
      metricClass,
      connectionStatus,
      connectionStatusClass,
      abstractLocation,
      getElectrodeLabel,
      getEventLabel,
      getInstantModeLabel,
      deviceSettings,
      settingsParams,
      hasSettings,
      currentMode,
      isModeActive,
      setUpRangeText,
      setOpRangeText,
      showLogModal,
      loggingInterval,
      setLoggingInterval,
      isValidTimeFormat,
      formatIntervalDescription,
      saveLoggingInterval,
      showModeModal,
      // Settings caching
      pendingChangesCount,
      showPendingChanges,
      pendingChangesList,
      stageSettingUpdate,
      updatePendingChangesDisplay,
      applyAllSettings,
      cancelAllSettings,
      initializeSettingsCache,

      showElectrodeModal,
      showNormalModal,
      showAutoModal,
      showSetNoModal,
      showManualModal,
      showDpolModal,
      showInstModal,
      showAlarmModal,
      showAlarmSetupModal,
      showAlarmSetopModal,
      showAlarmReffcalModal,
      openLogModal,
      openModeModal,

      openElectrodeModal,
      openAlarmModal,
      openAlarmItemModal,
      openNormalModal,
      openAutoModal,
      openManualModal,
      openDpolModal,
      openInstModal,
      closeLogModal,
      closeModeModal,

      closeElectrodeModal,
      closeAlarmModal,
      closeAlarmSetupModal,
      saveAlarmSetupModal,
      closeAlarmSetopModal,
      saveAlarmSetopModal,
      closeAlarmReffcalModal,
      // saveAlarmReffcalModal is no longer used - Reference Fail is read-only
      validateRefFcalInput,
      closeNormalModal,
      closeAutoModal,
      closeSetNoModal,
      saveInterruptModeConfiguration,
      saveTimerConfiguration,
      savingConfiguration,
      closeManualModal,
      closeDpolModal,
      closeInstModal,
      closeAllModals,
      backToModeModal,
      autoForm,
      dpolForm,
      instForm,
      selectedElectrode,

      alarmSetupForm,
      alarmSetopForm,
      alarmReffcalForm,
      setNoForm,
      // Shunt configuration
      shuntVoltageForm,
      shuntCurrentForm,
      showShuntVoltageModal,
      showShuntCurrentModal,
      openShuntVoltageModal,
      closeShuntVoltageModal,
      openShuntCurrentModal,
      closeShuntCurrentModal,
      saveShuntVoltage,
      saveShuntVoltageConfiguration,
      saveShuntCurrentConfiguration,
      validateVoltageInput,
      formatVoltageInput,
      validateCurrentInput,
      formatCurrentInput,
      formatShuntVoltageDisplay,
      formatShuntCurrentDisplay,
      formatVoltageValue,
      // Manual mode timer
      onSeconds,
      offSeconds,
      formatTotalTime,
      setOnTime,
      setOffTime,
      // Input handlers for Set UP/OP values
      handleSetupInput,
      formatSetupInput,
      handleSetopInput,
      formatSetopInput,
      // New configuration functions

      saveElectrodeConfiguration,
      getDefaultReferenceFail,
      executeManualAction,
      saveNormalModeConfiguration,
      saveDpolModeConfiguration,
      saveInstModeConfiguration,
      saveAlarmConfiguration,
      refreshDeviceData,
    };
  }
});
</script>

<template>
  <div class="card">
    <div class="card-header border-0 pt-6">
      <div class="card-title">
        <div class="d-flex align-items-center justify-content-between w-100">
          <div>
            <h3 class="mb-0">Device Details</h3>
          </div>
          <div class="d-flex align-items-center gap-2">
            <!-- Pending Changes Indicator -->
            <div v-if="pendingChangesCount > 0" class="alert alert-warning mb-0 py-2 px-3 d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle"></i>
              <span class="fw-bold">{{ pendingChangesCount }} pending change(s)</span>
              <button class="btn btn-sm btn-warning ms-2" @click="applyAllSettings">
                <i class="bi bi-check-circle me-1"></i>
                Apply All
              </button>
              <button class="btn btn-sm btn-danger" @click="cancelAllSettings">
                <i class="bi bi-x-circle me-1"></i>
                Cancel
              </button>
            </div>
            
            <button 
              class="btn btn-sm btn-icon btn-light" 
              @click="refreshDeviceData"
              title="Refresh device details"
            >
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            <span class="badge" :class="connectionStatusClass">
              <i class="bi bi-circle-fill me-1"></i>
              {{ connectionStatus }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body">
      <!-- TOP ROW: Left - Basic Info, Right - Device Matrix -->
      <div class="row mb-2">
        <!-- TOP LEFT: Basic Information -->
        <div class="col-lg-6">
          <div class="mb-5">
            <div class="d-flex flex-column">
              <div class="row mb-7">
                <label class="col-lg-4 fw-bold text-muted">Device Name</label>
                <div class="col-lg-8">
                  <span class="fw-bold fs-6 text-gray-800">{{ safeDevice.name }}</span>
                </div>
              </div>
              <div class="row mb-7">
                <label class="col-lg-4 fw-bold text-muted">Location</label>
                <div class="col-lg-8">
                  <span class="fw-bold fs-6 text-gray-800">{{ abstractLocation || safeDevice.location }}</span>
                </div>
              </div>
              <div class="row mb-7">
                <label class="col-lg-4 fw-bold text-muted">Type</label>
                <div class="col-lg-8">
                  <span class="fw-bold fs-6 text-gray-800">{{ safeDevice.type }}</span>
                </div>
              </div>
              <div class="row mb-7">
                <label class="col-lg-4 fw-bold text-muted">Status</label>
                <div class="col-lg-8">
                  <span class="badge" :class="statusClass">{{ safeDevice.status }}</span>
                </div>
              </div>
              <div class="row mb-7">
                <label class="col-lg-4 fw-bold text-muted">Last Seen</label>
                <div class="col-lg-8">
                  <span class="fw-bold fs-6 text-gray-800">{{ safeDevice.lastSeen }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TOP RIGHT: Device Matrix -->
        <div class="col-lg-6">
          <div class="mb-5">
            <h4 class="fs-1 text-gray-800 w-bolder mb-6">Device Matrix</h4>
            <div class="row g-3">
              <div class="col-md-3" v-for="metric in (safeDevice.metrics || [])" :key="metric.type">
                <div class="card bg-light">
                  <div class="card-body p-3">
                    <div class="d-flex flex-column align-items-center">
                      <i :class="[metric.icon, metricClass(metric)]" style="font-size: 1.5rem"></i>
                      <p class="text-muted mb-1 text-capitalize" style="font-size: 0.85rem">{{ metric.type }}</p>
                      <h6 class="mt-0 mb-0">{{ metric.value }}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM ROW: Left - Device Controls, Right - Device Settings -->
      <div class="row">
        <!-- BOTTOM LEFT: Device Controls -->
        <div class="col-lg-6">
          <div class="mb-5">
            <h4 class="fs-1 text-gray-800 w-bolder mb-6">Device Controls</h4>
            <div class="row g-3">
              <!-- 1. Electrode (first according to CSV sequence) -->
              <div class="col-md-6">
                <div class="control-box bg-info" @click="openElectrodeModal">
                  <i class="bi bi-lightning text-white" style="font-size: 2rem"></i>
                  <h5 class="mt-2 mb-0 text-white">Electrode</h5>
                  <p class="text-white-50 mb-0 small">Electrode Config</p>
                </div>
              </div>
              <!-- 2. Set Value (renamed from Alarm, second in sequence) -->
              <div class="col-md-6">
                <div class="control-box bg-danger" @click="openAlarmModal">
                  <i class="bi bi-exclamation-triangle text-white" style="font-size: 2rem"></i>
                  <h5 class="mt-2 mb-0 text-white">Set Value</h5>
                  <p class="text-white-50 mb-0 small">Value Settings</p>
                </div>
              </div>
              <!-- 3. Set Log (renamed from Log No, third in sequence) -->
              <div class="col-md-6">
                <div class="control-box bg-primary" @click="openLogModal">
                  <i class="bi bi-journal-text text-white" style="font-size: 2rem"></i>
                  <h5 class="mt-2 mb-0 text-white">Set Log</h5>
                  <p class="text-white-50 mb-0 small">Logging Settings</p>
                </div>
              </div>
              <!-- 4. Set Mode (renamed from Mode, fourth in sequence) -->
              <div class="col-md-6">
                <div class="control-box bg-success" @click="openModeModal">
                  <i class="bi bi-gear text-white" style="font-size: 2rem"></i>
                  <h5 class="mt-2 mb-0 text-white">Set Mode</h5>
                  <p class="text-white-50 mb-0 small">Mode Configuration</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM RIGHT: Device Settings -->
        <div class="col-lg-6">
          <div class="mb-5">
            <h4 class="fs-1 text-gray-800 w-bolder mb-6">Device Settings</h4>
            <div v-if="hasSettings">
              <div class="row g-3">
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-plug text-primary" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Electrode</p>
                        <h6 class="mt-0 mb-0">{{ getElectrodeLabel(settingsParams.Electrode) }}</h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-activity text-success" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Event Mode</p>
                        <h6 class="mt-0 mb-0">{{ getEventLabel(settingsParams.Event) }}</h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-lightning text-success" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Shunt Voltage</p>
                        <h6 class="mt-0 mb-0 text-gray-800">
                          {{ String(settingsParams?.['Shunt Voltage'] || '0').padStart(3, '0') }} mV
                        </h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-lightning-charge text-primary" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Shunt Current</p>
                        <h6 class="mt-0 mb-0">
                          {{ settingsParams?.['Shunt Current'] !== undefined ? formatShuntCurrentDisplay(settingsParams['Shunt Current']) : '9.9 A' }}
                        </h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-clock text-primary" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Interrupt ON</p>
                        <h6 class="mt-0 mb-0">{{ (parseFloat(settingsParams['Interrupt ON Time']) || 0).toFixed(1) }} s</h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-clock-history text-secondary" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Interrupt OFF</p>
                        <h6 class="mt-0 mb-0">{{ (parseFloat(settingsParams['Interrupt OFF Time']) || 0).toFixed(1) }} s</h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-exclamation-triangle text-warning" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Reference Fail</p>
                        <h6 class="mt-0 mb-0">{{ settingsParams?.['Reference Fail'] !== undefined ? formatVoltageValue(settingsParams['Reference Fail'], 2) : '0.00' }}V</h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-arrow-up-circle text-success" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Reference UP</p>
                        <h6 class="mt-0 mb-0">{{ settingsParams?.['Reference UP'] !== undefined ? formatVoltageValue(settingsParams['Reference UP']) : '0.00' }}V</h6>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card bg-light">
                    <div class="card-body p-3">
                      <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-gear text-primary" style="font-size: 1.5rem"></i>
                        <p class="text-muted mb-1" style="font-size: 0.85rem">Reference OP</p>
                        <h6 class="mt-0 mb-0">{{ settingsParams?.['Reference OP'] !== undefined ? formatVoltageValue(settingsParams['Reference OP']) : '0.00' }}V</h6>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <div class="card p-3">
                <p class="text-muted mb-0">No settings available for this device.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Alarm Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showAlarmModal, 'd-block': showAlarmModal }" v-if="showAlarmModal">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-danger">
          <h5 class="modal-title text-white">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Set Value Configuration
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="closeAlarmModal"></button>
        </div>
        <div class="modal-body p-4">
          <!-- Set Value Configuration Items -->
          <div class="row">
            <div class="col-md-6">
              <h6 class="fw-bold mb-4">SET REFERENCE VALUES</h6>
              
              <!-- Set UP -->
              <div class="card border mb-3 cursor-pointer" @click="openAlarmItemModal('setup')">
                <div class="card-body p-4 text-center">
                  <i class="bi bi-arrow-up-circle text-danger" style="font-size: 2rem"></i>
                  <h6 class="mt-2 mb-1">Set UP</h6>
                  <small class="text-muted">{{ settingsParams?.['Reference UP'] !== undefined ? formatVoltageValue(settingsParams['Reference UP']) : '0.00' }}V</small>
                </div>
              </div>

              <!-- Set OP -->
              <div class="card border mb-3 cursor-pointer" @click="openAlarmItemModal('setop')">
                <div class="card-body p-4 text-center">
                  <i class="bi bi-arrow-down-circle text-warning" style="font-size: 2rem"></i>
                  <h6 class="mt-2 mb-1">Set OP</h6>
                  <small class="text-muted">{{ settingsParams?.['Reference OP'] !== undefined ? formatVoltageValue(settingsParams['Reference OP']) : '0.00' }}V</small>
                </div>
              </div>

              <!-- Reference Fail (Read-only - Auto-calculated from Electrode) -->
              <div class="card border mb-3" style="opacity: 0.7;">
                <div class="card-body p-4 text-center">
                  <i class="bi bi-exclamation-triangle text-secondary" style="font-size: 2rem"></i>
                  <h6 class="mt-2 mb-1">Reference Fail</h6>
                  <small class="text-muted">{{ settingsParams?.['Reference Fail'] !== undefined ? formatVoltageValue(settingsParams['Reference Fail'], 2) : '0.00' }}V</small>
                  <small class="d-block text-muted mt-2" style="font-size: 0.75rem;"><em>(Auto-set with Electrode)</em></small>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <h6 class="fw-bold mb-4">SET SHUNT VALUES</h6>
              
              <!-- Set Voltage -->
              <div class="card border mb-3 cursor-pointer" @click="openShuntVoltageModal()">
                <div class="card-body p-4 text-center">
                  <i class="bi bi-lightning text-success" style="font-size: 2rem"></i>
                  <h6 class="mt-2 mb-1">Set Voltage</h6>
                  <small class="text-muted">{{ String(settingsParams?.['Shunt Voltage'] || '0').padStart(3, '0') }} mV</small>
                </div>
              </div>

              <!-- Set Shunt Current -->
              <div class="card border mb-3 cursor-pointer" @click="openShuntCurrentModal()">
                <div class="card-body p-4 text-center">
                  <i class="bi bi-lightning-charge text-primary" style="font-size: 2rem"></i>
                  <h6 class="mt-2 mb-1">Set Current</h6>
                  <small class="text-muted">{{ settingsParams?.['Shunt Current'] !== undefined ? formatShuntCurrentDisplay(settingsParams['Shunt Current']) : '9.9 A' }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeAlarmModal">Close</button>
          <button type="button" class="btn btn-danger" @click="saveAlarmConfiguration">Save Settings</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Alarm Setup Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showAlarmSetupModal, 'd-block': showAlarmSetupModal }" v-if="showAlarmSetupModal">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-danger">
          <h5 class="modal-title text-white">
            <i class="bi bi-arrow-up-circle me-2"></i>
            Set UP Configuration
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="closeAlarmSetupModal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Set UP Value</label>
            <div class="input-group">
              <input 
                type="text" 
                class="form-control" 
                v-model="alarmSetupForm.value" 
                placeholder="0.00"
                @input="handleSetupInput"
                @blur="formatSetupInput"
                maxlength="5"
              >
              <span class="input-group-text">V</span>
            </div>
            <small class="text-muted">{{ setUpRangeText }} (Format: 0.00)</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeAlarmSetupModal">Cancel</button>
          <button type="button" class="btn btn-danger" @click="saveAlarmSetupModal">Save</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Alarm Set OP Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showAlarmSetopModal, 'd-block': showAlarmSetopModal }" v-if="showAlarmSetopModal">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-warning">
          <h5 class="modal-title text-dark">
            <i class="bi bi-arrow-down-circle me-2"></i>
            Set OP Configuration
          </h5>
          <button type="button" class="btn-close" @click="closeAlarmSetopModal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Set OP Value</label>
            <div class="input-group">
              <input 
                type="text" 
                class="form-control" 
                v-model="alarmSetopForm.value" 
                placeholder="0.00"
                @input="handleSetopInput"
                @blur="formatSetopInput"
                maxlength="5"
              >
              <span class="input-group-text">V</span>
            </div>
            <small class="text-muted">{{ setOpRangeText }} (Format: 0.00)</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeAlarmSetopModal">Cancel</button>
          <button type="button" class="btn btn-warning" @click="saveAlarmSetopModal">Save</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Alarm Reference Fail Modal (Read-only) -->
  <div class="modal fade" tabindex="-1" :class="{ show: showAlarmReffcalModal, 'd-block': showAlarmReffcalModal }" v-if="showAlarmReffcalModal">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-info">
          <h5 class="modal-title text-white">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Reference Fail Configuration
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="closeAlarmReffcalModal"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info" role="alert">
            <i class="bi bi-info-circle me-2"></i>
            <strong>Reference Fail is automatically set based on the selected Electrode type.</strong>
            <br/>
            <small class="mt-2 d-block">
              • Cu/CuSO4: 0.30V<br/>
              • Zinc: -0.80V<br/>
              • Ag/AgCl: 0.30V
            </small>
          </div>
          <div class="mb-3">
            <label class="form-label">Reference Fail Value (Read-only)</label>
            <div class="input-group">
              <input 
                type="number" 
                class="form-control" 
                v-model="alarmReffcalForm.value" 
                step="0.1"
                min="-4.0"
                max="4.0"
                disabled
              >
              <span class="input-group-text">V</span>
            </div>
            <small class="text-muted">This field is automatically calculated and cannot be edited manually.</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeAlarmReffcalModal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Log Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showLogModal, 'd-block': showLogModal }" v-if="showLogModal">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h5 class="modal-title text-white">
            <i class="bi bi-journal-text me-2"></i>
            Set Log - Logging Interval Configuration
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="closeLogModal"></button>
        </div>
        <div class="modal-body p-4">
          <div class="alert alert-info mb-4">
            <i class="bi bi-info-circle me-2"></i>
            Configure how frequently the device should log and transmit data over MQTT.
          </div>
          
          <div class="row">
            <div class="col-md-12">
              <div class="card border-primary">
                <div class="card-header bg-light">
                  <h6 class="mb-2">
                    <i class="bi bi-clock me-2"></i>
                    Logging Interval
                  </h6>
                </div>
                <div class="card-body">
                  <div class="row align-items-center">
                    <div class="col-md-6">
                      <label class="form-label fw-bold">Logging Interval (HH:MM:SS)</label>
                      <div class="input-group">
                        <span class="input-group-text">
                          <i class="bi bi-stopwatch"></i>
                        </span>
                        <input 
                          type="text" 
                          class="form-control" 
                          v-model="loggingInterval"
                          placeholder="00:01:00"
                          pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
                          title="Format: HH:MM:SS (e.g., 00:01:30 for 1 minute 30 seconds). Cannot be 00:00:00."
                        />
                      </div>
                      <small class="text-muted">
                        Format: Hours:Minutes:Seconds (e.g., 00:01:00 = 1 minute)
                        <span class="text-danger fw-bold">⚠️ Cannot be 00:00:00 (disables logging)</span>
                      </small>
                    </div>
                    <div class="col-md-6">
                      <div class="bg-light p-3 rounded">
                        <h6 class="mb-2">Current Setting:</h6>
                        <div class="d-flex align-items-center">
                          <span class="badge bg-primary fs-6 me-2">{{ loggingInterval }}</span>
                          <small class="text-muted">{{ formatIntervalDescription(loggingInterval) }}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <hr class="my-4">
                  
                  <div class="row">
                    <div class="col-md-12">
                      <h6 class="mb-3">Quick Presets:</h6>
                      <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-outline-primary btn-sm" @click="setLoggingInterval('00:00:30')">
                          30 seconds
                        </button>
                        <button class="btn btn-outline-primary btn-sm" @click="setLoggingInterval('00:01:00')">
                          1 minute
                        </button>
                        <button class="btn btn-outline-primary btn-sm" @click="setLoggingInterval('00:05:00')">
                          5 minutes
                        </button>
                        <button class="btn btn-outline-primary btn-sm" @click="setLoggingInterval('00:10:00')">
                          10 minutes
                        </button>
                        <button class="btn btn-outline-primary btn-sm" @click="setLoggingInterval('00:30:00')">
                          30 minutes
                        </button>
                        <button class="btn btn-outline-primary btn-sm" @click="setLoggingInterval('01:00:00')">
                          1 hour
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeLogModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="saveLoggingInterval" :disabled="!isValidTimeFormat(loggingInterval)">
            <i class="bi bi-check-circle me-2"></i>
            Apply Logging Interval
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Mode Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showModeModal, 'd-block': showModeModal }" v-if="showModeModal">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Device Mode Configuration</h5>
          <button type="button" class="btn-close" @click="closeModeModal"></button>
        </div>
        <div class="modal-body">
          <p class="mb-4">Select the operating mode for the device: <strong>Current: {{ getEventLabel(currentMode) }}</strong></p>
          <div class="row g-3">
            <div class="col-md-4">
              <div class="mode-option bg-primary" :class="{ selected: isModeActive(0) }" @click="openNormalModal">
                <i class="bi bi-circle" style="font-size: 1.8rem"></i>
                <h6 class="mt-2 mb-0">Normal</h6>
                <small v-if="isModeActive(0)">✓ Active</small>
              </div>
            </div>
            <div class="col-md-4">
              <div class="mode-option bg-success" :class="{ selected: isModeActive(1) }" @click="openAutoModal">
                <i class="bi bi-gear-fill" style="font-size: 1.8rem"></i>
                <h6 class="mt-2 mb-0">Interrupt Auto</h6>
                <small v-if="isModeActive(1)">✓ Active</small>
              </div>
            </div>
            <div class="col-md-4">
              <div class="mode-option bg-warning" :class="{ selected: isModeActive(2) }" @click="openManualModal">
                <i class="bi bi-hand-index" style="font-size: 1.8rem"></i>
                <h6 class="mt-2 mb-0">Interrupt Manual</h6>
                <small v-if="isModeActive(2)">✓ Active</small>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mode-option bg-info" :class="{ selected: isModeActive(3) }" @click="openDpolModal">
                <i class="bi bi-diagram-3" style="font-size: 1.8rem"></i>
                <h6 class="mt-2 mb-0">DPOL</h6>
                <small v-if="isModeActive(3)">✓ Active</small>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mode-option bg-danger" :class="{ selected: isModeActive(4) }" @click="openInstModal">
                <i class="bi bi-speedometer2" style="font-size: 1.8rem"></i>
                <h6 class="mt-2 mb-0">INST</h6>
                <small v-if="isModeActive(4)">✓ Active</small>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModeModal">Close</button>
        </div>
      </div>
    </div>
  </div>
  <!-- SET NO Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showSetNoModal, 'd-block': showSetNoModal }" v-if="showSetNoModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">SET NO Configuration</h5>
          <button type="button" class="btn-close" @click="closeSetNoModal"></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <!-- TON (Timer ON) Configuration -->
            <div class="col-md-6">
              <div class="card border-success mb-3">
                <div class="card-header bg-success text-white">
                  <h6 class="mb-0"><i class="bi bi-play-circle me-2"></i>TON (Timer ON)</h6>
                </div>
                <div class="card-body">
                  <div class="row g-2">
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.ton.field1" placeholder="00" min="0" max="99">
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="timer-separator">|</span>
                    </div>
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.ton.field2" placeholder="00" min="0" max="99">
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="timer-separator">|</span>
                    </div>
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.ton.field3" placeholder="00" min="0" max="99">
                    </div>
                  </div>
                  <div class="row g-2 mt-2">
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.ton.field4" placeholder="00" min="0" max="99">
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="timer-separator">|</span>
                    </div>
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.ton.field5" placeholder="00" min="0" max="99">
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="timer-separator">|</span>
                    </div>
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.ton.field6" placeholder="00" min="0" max="99">
                    </div>
                  </div>
                  <small class="form-text text-muted mt-2">Set timer ON duration values</small>
                </div>
              </div>
            </div>

            <!-- TOFF (Timer OFF) Configuration -->
            <div class="col-md-6">
              <div class="card border-danger mb-3">
                <div class="card-header bg-danger text-white">
                  <h6 class="mb-0"><i class="bi bi-stop-circle me-2"></i>TOFF (Timer OFF)</h6>
                </div>
                <div class="card-body">
                  <div class="row g-2">
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.toff.field1" placeholder="00" min="0" max="99">
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="timer-separator">|</span>
                    </div>
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.toff.field2" placeholder="00" min="0" max="99">
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="timer-separator">|</span>
                    </div>
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.toff.field3" placeholder="00" min="0" max="99">
                    </div>
                  </div>
                  <div class="row g-2 mt-2">
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.toff.field4" placeholder="00" min="0" max="99">
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="timer-separator">|</span>
                    </div>
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.toff.field5" placeholder="00" min="0" max="99">
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="timer-separator">|</span>
                    </div>
                    <div class="col-2">
                      <input type="number" class="form-control text-center timer-input" v-model="setNoForm.toff.field6" placeholder="00" min="0" max="99">
                    </div>
                  </div>
                  <small class="form-text text-muted mt-2">Set timer OFF duration values</small>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Timer Status Display -->
          <div class="row mt-3">
            <div class="col-md-12">
              <div class="alert alert-info">
                <h6><i class="bi bi-info-circle me-2"></i>Timer Configuration Summary</h6>
                <div class="row">
                  <div class="col-md-6">
                    <strong>TON:</strong> 
                    {{ setNoForm.ton.field1 || '00' }}|{{ setNoForm.ton.field2 || '00' }}|{{ setNoForm.ton.field3 || '00' }} / 
                    {{ setNoForm.ton.field4 || '00' }}|{{ setNoForm.ton.field5 || '00' }}|{{ setNoForm.ton.field6 || '00' }}
                  </div>
                  <div class="col-md-6">
                    <strong>TOFF:</strong> 
                    {{ setNoForm.toff.field1 || '00' }}|{{ setNoForm.toff.field2 || '00' }}|{{ setNoForm.toff.field3 || '00' }} / 
                    {{ setNoForm.toff.field4 || '00' }}|{{ setNoForm.toff.field5 || '00' }}|{{ setNoForm.toff.field6 || '00' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeSetNoModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="saveTimerConfiguration">Save Timer Configuration</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Electrode Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showElectrodeModal, 'd-block': showElectrodeModal }" v-if="showElectrodeModal">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Electrode Configuration</h5>
          <button type="button" class="btn-close" @click="closeElectrodeModal"></button>
        </div>
        <div class="modal-body">
          <p class="mb-4">Select the electrode type:</p>
          <div class="row g-2">
            <div class="col-md-6">
              <div class="option-box-sm" :class="{ selected: selectedElectrode === 'Cu/CuSO4' }" @click="selectedElectrode = 'Cu/CuSO4'">
                <i class="bi bi-circle" style="font-size: 1.5rem"></i>
                <h6 class="mt-2 mb-0">Cu/CuSO4</h6>
                <small class="text-muted">Copper Sulfate</small>
              </div>
            </div>
            <div class="col-md-6">
              <div class="option-box-sm" :class="{ selected: selectedElectrode === 'Zinc' }" @click="selectedElectrode = 'Zinc'">
                <i class="bi bi-hexagon" style="font-size: 1.5rem"></i>
                <h6 class="mt-2 mb-0">Zinc</h6>
                <small class="text-muted">Zinc Electrode</small>
              </div>
            </div>
            <div class="col-md-6">
              <div class="option-box-sm" :class="{ selected: selectedElectrode === 'Ag/AgCl' }" @click="selectedElectrode = 'Ag/AgCl'">
                <i class="bi bi-diamond" style="font-size: 1.5rem"></i>
                <h6 class="mt-2 mb-0">Ag/AgCl</h6>
                <small class="text-muted">Silver Chloride</small>
              </div>
            </div>
          </div>
          
          <!-- Selected Electrode Display -->
          <div v-if="selectedElectrode" class="mt-4">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              <strong>Selected:</strong> {{ selectedElectrode }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeElectrodeModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="saveElectrodeConfiguration" :disabled="!selectedElectrode">Apply</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Normal Mode Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showNormalModal, 'd-block': showNormalModal }" v-if="showNormalModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <div class="d-flex align-items-center">
            <button type="button" class="btn btn-sm btn-light me-3" @click="backToModeModal">
              <i class="bi bi-arrow-left"></i> Back
            </button>
            <h5 class="modal-title mb-0">Normal Mode Configuration</h5>
          </div>
         
        </div>
        <div class="modal-body">
          <p>No interruptions. Data Monitoring mode.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="backToModeModal">Back to Modes</button>
          <button type="button" class="btn btn-primary" @click="saveNormalModeConfiguration">Save Configuration</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Interrupt Mode Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showAutoModal, 'd-block': showAutoModal }" v-if="showAutoModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <div class="d-flex align-items-center">
            <button type="button" class="btn btn-sm btn-light me-3" @click="backToModeModal">
              <i class="bi bi-arrow-left"></i> Back
            </button>
            <h5 class="modal-title mb-0">Interrupt Auto Mode Configuration</h5>
          </div>
          <button type="button" class="btn-close" @click="closeAutoModal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <!-- Left Column - Dates and Times -->
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">Start Date</label>
                <input type="date" class="form-control" v-model="autoForm.startDate">
              </div>
              <div class="mb-3">
                <label class="form-label">Start Time</label>
                <input type="time" class="form-control" v-model="autoForm.startTime">
              </div>
            </div>

            <!-- Right Column - Stop Date/Time and Intervals -->
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">Stop Date</label>
                <input type="date" class="form-control" v-model="autoForm.stopDate">
              </div>
              <div class="mb-3">
                <label class="form-label">Stop Time</label>
                <input type="time" class="form-control" v-model="autoForm.stopTime">
              </div>
            </div>

            <!-- Interval Settings -->
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">ON Interval (Seconds)</label>
                <input type="number" class="form-control" v-model="onSeconds" step="0.1" min="0" max="9999.9" placeholder="0.0">
              </div>
            </div>

            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">OFF Interval (Seconds)</label>
                <input type="number" class="form-control" v-model="offSeconds" step="0.1" min="0" max="9999.9" placeholder="0.0">
              </div>
            </div>

            <!-- Summary -->
            <div class="col-md-12">
              <div class="alert alert-info">
                <strong>Cycle:</strong> ON {{ formatTotalTime(onSeconds) }} → OFF {{ formatTotalTime(offSeconds) }}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="backToModeModal">Back to Modes</button>
          <button type="button" class="btn btn-primary" @click="saveInterruptModeConfiguration" :disabled="savingConfiguration">
            <span v-if="savingConfiguration" class="spinner-border spinner-border-sm me-2" role="status"></span>
            {{ savingConfiguration ? 'Sending to Device...' : 'Save Configuration' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Manual Mode Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showManualModal, 'd-block': showManualModal }" v-if="showManualModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <div class="d-flex align-items-center">
            <button type="button" class="btn btn-sm btn-light me-3" @click="backToModeModal">
              <i class="bi bi-arrow-left"></i> Back
            </button>
            <h5 class="modal-title mb-0">Interrupt Manual Mode Configuration</h5>
          </div>
          <button type="button" class="btn-close" @click="closeManualModal"></button>
        </div>
        <div class="modal-body">
          <!-- Timer Configuration Section -->
          <div class="timer-config-section mb-4">
            <div class="row g-4">
              <!-- ON Timer Card -->
              <div class="col-md-6">
                <div class="timer-card on-timer">
                  <div class="timer-card-header">
                    <i class="bi bi-play-circle-fill"></i>
                    <span>ON Timer</span>
                  </div>
                  <div class="timer-card-body">
                    <!-- Seconds Only Input -->
                    <div class="time-input-group">
                      <div class="time-input-box">
                        <input type="number" class="time-digit" v-model="onSeconds" step="0.1" min="0" max="9999.9" placeholder="0000.0">
                        <label>Seconds</label>
                      </div>
                    </div>
                    
                    <!-- Total Seconds Display -->
                    <div class="total-display on-total">
                      <i class="bi bi-clock"></i>
                      <span>{{ formatTotalTime(onSeconds) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- OFF Timer Card -->
              <div class="col-md-6">
                <div class="timer-card off-timer">
                  <div class="timer-card-header">
                    <i class="bi bi-stop-circle-fill"></i>
                    <span>OFF Timer</span>
                  </div>
                  <div class="timer-card-body">
                    <!-- Seconds Only Input -->
                    <div class="time-input-group">
                      <div class="time-input-box">
                        <input type="number" class="time-digit" v-model="offSeconds" step="0.1" min="0" max="9999.9" placeholder="0000.0">
                        <label>Seconds</label>
                      </div>
                    </div>
                    
                    <!-- Total Seconds Display -->
                    <div class="total-display off-total">
                      <i class="bi bi-clock"></i>
                      <span>{{ formatTotalTime(offSeconds) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cycle Summary -->
          <div class="cycle-summary">
            <div class="cycle-info">
              <i class="bi bi-arrow-repeat"></i>
              <span class="cycle-text">
                Cycle: <strong class="on-highlight">ON {{ formatTotalTime(onSeconds) }}</strong>
                <i class="bi bi-arrow-right mx-2"></i>
                <strong class="off-highlight">OFF {{ formatTotalTime(offSeconds) }}</strong>
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-section mt-4">
            <div class="row g-3">
              <div class="col-md-6">
                <button class="action-btn start-btn" @click="executeManualAction('start')">
                  <i class="bi bi-play-fill"></i>
                  <div class="btn-content">
                    <span class="btn-title">START</span>
                    <span class="btn-subtitle">Begin operation cycle</span>
                  </div>
                </button>
              </div>
              <div class="col-md-6">
                <button class="action-btn stop-btn" @click="executeManualAction('stop')">
                  <i class="bi bi-stop-fill"></i>
                  <div class="btn-content">
                    <span class="btn-title">STOP</span>
                    <span class="btn-subtitle">Halt device immediately</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="backToModeModal">Back to Modes</button>
        </div>
      </div>
    </div>
  </div>

  <!-- DPOL Mode Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showDpolModal, 'd-block': showDpolModal }" v-if="showDpolModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <div class="d-flex align-items-center">
            <button type="button" class="btn btn-sm btn-light me-3" @click="backToModeModal">
              <i class="bi bi-arrow-left"></i> Back
            </button>
            <h5 class="modal-title mb-0">DPOL Mode Configuration</h5>
          </div>
          <button type="button" class="btn-close" @click="closeDpolModal"></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <!-- Left Column -->
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">Start Date & Time</label>
                <div class="row g-2">
                  <div class="col-6">
                    <input type="date" class="form-control" v-model="dpolForm.startDate">
                  </div>
                  <div class="col-6">
                    <input type="time" class="form-control" v-model="dpolForm.startTime">
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">End Date & Time</label>
                <div class="row g-2">
                  <div class="col-6">
                    <input type="date" class="form-control" v-model="dpolForm.endDate">
                  </div>
                  <div class="col-6">
                    <input type="time" class="form-control" v-model="dpolForm.endTime">
                  </div>
                </div>
              </div>
            </div>
            <!-- Right Column -->
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">Data logging interval (HH:MM:SS)</label>
                <input type="text" class="form-control" v-model="dpolForm.interval" placeholder="00:00:05">
                <small class="form-text text-muted">Data logging interval (HH:MM:SS format)</small>
              </div>
            </div>

          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="backToModeModal">Back to Modes</button>
          <button type="button" class="btn btn-primary" @click="saveDpolModeConfiguration">Save Configuration</button>
        </div>
      </div>
    </div>
  </div>

  <!-- INST Mode Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showInstModal, 'd-block': showInstModal }" v-if="showInstModal">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <div class="d-flex align-items-center">
            <button type="button" class="btn btn-sm btn-light me-3" @click="backToModeModal">
              <i class="bi bi-arrow-left"></i> Back
            </button>
            <h5 class="modal-title mb-0">INST Mode Configuration</h5>
          </div>
          <button type="button" class="btn-close" @click="closeInstModal"></button>
        </div>
        <div class="modal-body">
          <div class="row">
            <!-- Left Column -->
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">Start Time (HH:MM:SS)</label>
                <input type="time" step="1" class="form-control" v-model="instForm.startTime" placeholder="00:00:00">
                <small class="form-text text-muted">Format: Hours:Minutes:Seconds</small>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Frequency</label>
                <div class="d-flex gap-3">
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="instFrequency" id="instDaily" value="daily" v-model="instForm.frequency">
                    <label class="form-check-label" for="instDaily">Daily</label>
                  </div>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="instFrequency" id="instWeekly" value="weekly" v-model="instForm.frequency">
                    <label class="form-check-label" for="instWeekly">Weekly</label>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Right Column - Empty for now -->
            <div class="col-md-6">
              <!-- Reserved for future use -->
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="backToModeModal">Back to Modes</button>
          <button type="button" class="btn btn-primary" @click="saveInstModeConfiguration">Save Configuration</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Shunt Voltage Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showShuntVoltageModal, 'd-block': showShuntVoltageModal }" v-if="showShuntVoltageModal">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-success">
          <h5 class="modal-title text-white">
            <i class="bi bi-lightning me-2"></i>
            Set Voltage Configuration
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="closeShuntVoltageModal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Select Voltage Value</label>
            <select 
              class="form-select" 
              v-model="shuntVoltageForm.value"
            >
              <option value="025">25</option>
              <option value="050">50</option>
              <option value="075">75</option>
              <option value="100">100</option>
            </select>
            <small class="text-muted">Select from available voltage options</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeShuntVoltageModal">Close</button>
          <button type="button" class="btn btn-success" @click="saveShuntVoltage">Save Voltage</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Shunt Current Modal -->
  <div class="modal fade" tabindex="-1" :class="{ show: showShuntCurrentModal, 'd-block': showShuntCurrentModal }" v-if="showShuntCurrentModal">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h5 class="modal-title text-white">
            <i class="bi bi-flash me-2"></i>
            Set Shunt Configuration
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="closeShuntCurrentModal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Shunt Current Value (00.0 - 99.9)</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="shuntCurrentForm.value"
              placeholder="Enter current value (e.g., 99.0)"
              @input="validateCurrentInput"
              @blur="formatCurrentInput"
              maxlength="4"
            >
            <small class="text-muted">Format: 00.0 (Auto-adds decimal after 2 digits, max 4 characters)</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeShuntCurrentModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="saveShuntCurrentConfiguration">Save</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Backdrop -->
  <div class="modal-backdrop fade show" v-if="showLogModal || showModeModal || showElectrodeModal || showNormalModal || showAutoModal || showManualModal || showDpolModal || showInstModal || showAlarmModal || showAlarmSetupModal || showAlarmSetopModal || showAlarmReffcalModal || showShuntVoltageModal || showShuntCurrentModal" @click="closeAllModals"></div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.cursor-pointer:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* ✅ CENTER ALL MODALS */
.modal {
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-dialog {
  margin: 0 auto;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content {
  border-radius: 10px;
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  background-color: #f8f9fa;
}

/* ✅ STANDARDIZED OPTION BOX STYLING FOR ALL MODALS */
.option-box {
  border: 3px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  background-color: white;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.option-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #bbb;
}

/* ✅ CONTROL BOX STYLING (Device Controls Section) */
.control-box {
  border: 3px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 100%);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.control-box:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

/* ✅ SMALL OPTION BOX FOR MODALS (Electrode, etc.) */
.option-box-sm {
  border: 3px solid #dee2e6;
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  background-color: white;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.option-box-sm:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #bbb;
}

/* ✅ SELECTED STATE - SMALL OPTION BOX */
.option-box-sm.selected {
  border-color: #28a745 !important;
  background-color: #e7f5f1 !important;
  color: #155724;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
}

.option-box-sm.selected i {
  color: #28a745 !important;
}

.option-box-sm.selected h6 {
  color: #155724 !important;
}

/* ✅ MODE OPTIONS WITH COLORS */
.mode-option {
  border: 3px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  color: white;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.mode-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.mode-option i {
  color: white;
}

.mode-option h6 {
  color: white;
}

.mode-option.selected {
  border-color: #28a745 !important;
  border-width: 3px !important;
  box-shadow: inset 0 0 0 3px rgba(40, 167, 69, 0.3), 0 4px 12px rgba(40, 167, 69, 0.2);
}

/* ✅ SELECTED STATE - CONSISTENT GREEN COLOR ACROSS ALL MODALS */
.option-box.selected,
.option-box.active {
  border-color: #28a745 !important;
  background-color: #e7f5f1 !important;
  color: #155724;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
}

.option-box.selected i,
.option-box.active i {
  color: #28a745 !important;
}

.option-box.selected h6,
.option-box.active h6 {
  color: #155724 !important;
}

.option-box.selected small,
.option-box.active small {
  color: #155724 !important;
  font-weight: bold;
}

/* ✅ RESPONSIVE MODAL CENTERING */
@media (max-width: 768px) {
  .modal-dialog {
    margin: auto;
    width: 95%;
  }
}

/* ✅ MODAL FOOTER STYLING */
.modal-footer {
  background-color: #f8f9fa;
  border-top: 1px solid #dee2e6;
  border-radius: 0 0 10px 10px;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.modal-header {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  color: white;
}

.modal-header .modal-title {
  color: white;
  font-weight: 600;
}

.modal-header .btn-close {
  filter: invert(1);
}

.modal-header .btn-light {
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.modal-header .btn-light:hover {
  background-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.modal-body {
  padding: 2rem;
  background-color: #ffffff;
  color: #333;
}

/* ✅ MODAL FOOTER STYLING */
.modal-footer {
  background-color: #f8f9fa;
  border-top: 1px solid #dee2e6;
  border-radius: 0 0 10px 10px;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* ✅ MODAL BACKDROP */
.modal-backdrop {
  opacity: 0.5 !important;
}

.form-control {
  border-radius: 6px;
  border: 1px solid #ced4da;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.5rem;
}

.electrode-card {
  transition: all 0.2s ease-in-out;
  border: 2px solid transparent;
}

.electrode-card:hover {
  border-color: #80bdff;
  transform: translateY(-2px);
}

.electrode-card.selected {
  border-color: #007bff;
  background-color: #f8f9ff;
}

.form-check-input:checked {
  background-color: #007bff;
  border-color: #007bff;
}

.alert-info {
  background-color: #d1ecf1;
  border-color: #bee5eb;
  color: #0c5460;
}

.timer-input {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 1.1rem;
  max-width: 50px;
  padding: 0.375rem 0.25rem;
}

.timer-input-large {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  border: 2px solid #dee2e6;
  transition: all 0.3s ease;
}

.timer-input-large:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.3rem rgba(0, 123, 255, 0.15);
  background-color: #fff;
}

.timer-display {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #dee2e6;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.timer-separator {
  font-size: 1.5rem;
  font-weight: bold;
  color: #6c757d;
  line-height: 1;
}

.card-header {
  font-weight: 600;
}

.card-header .bi {
  font-size: 1.1rem;
}

.timer-input:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  background-color: #fff;
}

.border-success {
  border-color: #28a745 !important;
}

.border-danger {
  border-color: #dc3545 !important;
}

/* Manual Mode Timer Styling */
.timer-config-section {
  padding: 1rem 0;
}

.timer-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.timer-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
}

.timer-card-header {
  padding: 1rem 1.5rem;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.on-timer .timer-card-header {
  background: #28a745;
  color: white;
}

.off-timer .timer-card-header {
  background: #dc3545;
  color: white;
}

.timer-card-body {
  padding: 2rem 1.5rem;
  background: #f8f9fa;
}

.time-input-group {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.time-input-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-digit {
  width: 180px;
  height: 65px;
  font-size: 1.8rem;
  font-weight: bold;
  text-align: center;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  background: white;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
  padding: 0.5rem;
}

.time-digit:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.25rem rgba(0, 123, 255, 0.25);
  transform: scale(1.05);
}

.time-input-box label {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
}

.time-separator {
  font-size: 2.5rem;
  font-weight: bold;
  color: #6c757d;
  margin: 10px 0;
}

.total-display {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.on-total {
  background: #d4edda;
  border: 2px solid #28a745;
  color: #155724;
}

.off-total {
  background: #f8d7da;
  border: 2px solid #dc3545;
  color: #721c24;
}

.preset-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 0.5rem 1rem;
  border: 2px solid;
  border-radius: 20px;
  font-weight: 600;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.on-preset {
  border-color: #28a745;
  color: #28a745;
}

.on-preset:hover {
  background: #28a745;
  color: white;
  transform: scale(1.05);
}

.off-preset {
  border-color: #dc3545;
  color: #dc3545;
}

.off-preset:hover {
  background: #dc3545;
  color: white;
  transform: scale(1.05);
}

.cycle-summary {
  background: #e3f2fd;
  border: 2px solid #2196f3;
  border-radius: 10px;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
}

.cycle-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 1rem;
}

.cycle-info i {
  font-size: 1.5rem;
  color: #2196f3;
}

.on-highlight {
  color: #28a745;
  padding: 0.25rem 0.5rem;
  background: rgba(40, 167, 69, 0.1);
  border-radius: 4px;
}

.off-highlight {
  color: #dc3545;
  padding: 0.25rem 0.5rem;
  background: rgba(220, 53, 69, 0.1);
  border-radius: 4px;
}

.action-section {
  padding-top: 1rem;
}

.action-btn {
  width: 100%;
  padding: 1.5rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.action-btn i {
  font-size: 2.5rem;
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.btn-title {
  font-size: 1.5rem;
  letter-spacing: 1px;
}

.btn-subtitle {
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.9;
}

.start-btn {
  background: #28a745;
  color: white;
}

.start-btn:hover {
  background: #218838;
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
}

.stop-btn {
  background: #dc3545;
  color: white;
}

.stop-btn:hover {
  background: #c82333;
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
}
</style>

