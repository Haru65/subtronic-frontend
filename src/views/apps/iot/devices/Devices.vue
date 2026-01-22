<template>
  <div>
    <!-- Search & Filters Row -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-5 gap-3">
      <!-- Search Input -->
      <div class="position-relative w-100 w-sm-auto">
        <KTIcon
          icon-name="magnifier"
          icon-class="fs-1 position-absolute top-50 translate-middle-y ms-3"
        />
        <input
          type="text"
          v-model="searchQuery"
          @input="searchItems"
          class="form-control form-control ps-10 w-100 w-sm-250px text-gray-800"
          placeholder="Search devices by name..."
        />
      </div>

      <!-- Add Device Button -->
      <button 
        class="btn btn-primary"
        data-bs-toggle="modal"
        data-bs-target="#addDeviceModal"
      >
        <i class="bi bi-plus-circle me-2"></i>Add Device
      </button>
    </div>

    <!-- Nav Tabs (Filters) -->
    <ul class="nav nav-tabs mb-5 cursor-pointer">
      <li class="nav-item">
        <a
          class="nav-link"
          :class="{ active: currentFilter === 'all' }"
          @click="applyFilter('all')"
        >
          All
        </a>
      </li>
      <li class="nav-item">
        <a
          class="nav-link"
          :class="{ active: currentFilter === 'online' }"
          @click="applyFilter('online')"
        >
          Online
        </a>
      </li>
      <li class="nav-item">
        <a
          class="nav-link"
          :class="{ active: currentFilter === 'offline' }"
          @click="applyFilter('offline')"
        >
          Offline
        </a>
      </li>
      <li class="nav-item">
        <a
          class="nav-link"
          :class="{ active: currentFilter === 'warning' }"
          @click="applyFilter('warning')"
        >
          Warning
        </a>
      </li>
    </ul>

    <!-- Devices Grid -->
    <div v-if="filteredDevices.length > 0" class="row g-4">
      <div
        class="col-lg-4 col-md-6 col-sm-12"
        v-for="device in filteredDevices"
        :key="device.id"
      >
        <DeviceCardWidget v-bind="device" @deviceRemoved="handleDeviceRemoved" />
      </div>
    </div>

    <!-- No Devices Found Message -->
    <div v-else class="text-center text-muted py-10">
      <i class="bi bi-search fs-1 mb-3"></i>
      <p class="fs-5 fw-semibold mb-1">No devices found</p>
      <p class="small">Try adjusting your search or filter criteria.</p>
    </div>

    <!-- Add Device Modal -->
    <AddDeviceModal @deviceCreated="handleDeviceCreated" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import DeviceCardWidget from "@/components/iot/component/dashboard/DeviceCardWidget.vue";
import AddDeviceModal from "@/components/iot/AddDeviceModal.vue";
import KTIcon from "@/core/helpers/kt-icon/KTIcon.vue";
import { reverseGeocode } from "@/utils/reverseGeocode";

// Define the possible status values
type DeviceStatus = "online" | "offline" | "warning" | "critical";

// Interface for device metrics
interface Metric {
  type: string;
  value: number;
  icon: string;
}

// Interface for device data
interface Device {
  id: string;
  name: string;
  icon: string;
  type: string;
  location: string;
  status: DeviceStatus;
  lastSeen: string;
  metrics: Metric[];
}

export default defineComponent({
  name: "Devices",
  components: {
    DeviceCardWidget,
    AddDeviceModal,
    KTIcon,
  },
  setup() {
    // Search and filter state
    const searchQuery = ref("");
    const currentFilter = ref("all");
    const loading = ref(true);
    const error = ref<string | null>(null);

    // Device data - now loaded dynamically from backend
    const devices = ref<Device[]>([]);
    const locationCache = ref<Map<string, string>>(new Map());
    
    // Fetch devices from backend
    const fetchDevices = async () => {
      try {
        loading.value = true;
        error.value = null;
        console.log('🔍 Fetching devices from API...');
        
        const apiUrl = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
        console.log('📡 API URL:', apiUrl);
        const response = await fetch(`${apiUrl}/api/devices`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 Received from API:', result);
        
        // API returns an array directly
        let deviceList = Array.isArray(result) ? result : (result.devices || []);
        console.log('📦 Device list:', deviceList);
        
        // Transform to match frontend format - ensure all fields are properly mapped
        const transformedDevices = deviceList.map((device: any) => ({
          id: device.id || device.deviceId,
          sensorId: device.sensorId || device.id || device.deviceId,
          name: device.name || `Device ${device.id || device.deviceId}`,
          icon: device.icon || 'bi-device',
          type: device.type || 'IoT Sensor',
          location: device.location || 'N/A',
          status: device.status || 'offline',  // Real status from telemetry
          lastSeen: device.lastSeen || 'Never', // Latest timestamp
          metrics: device.metrics || []
        }));
        
        console.log('🔄 Transformed devices:', transformedDevices);
        
        devices.value = transformedDevices;
        
        // Process location data for all devices
        await processDeviceLocations();
        
        console.log('✅ Updated devices.value:', devices.value.length, 'devices');
      } catch (err: any) {
        console.error('❌ Error fetching devices:', err);
        error.value = err.message || 'Failed to load devices from backend';
        
        // Fallback to static devices if API fails
        devices.value = [
          {
            id: "123",
            name: "Sensor 1",
            icon: "bi-lightbulb",
            type: "light",
            location: "Location 1",
            status: "offline",
            lastSeen: "Never",
            metrics: [
              { type: "battery", value: 0, icon: "bi-battery-full" },
              { type: "signal", value: 0, icon: "bi-wifi" },
              { type: "temperature", value: 0, icon: "bi-thermometer" },
            ],
          },
          {
            id: "234",
            name: "Sensor 2",
            icon: "bi-thermometer-half",
            type: "thermostat",
            location: "Location 2",
            status: "offline",
            lastSeen: "Never",
            metrics: [
              { type: "battery", value: 0, icon: "bi-battery-half" },
              { type: "signal", value: 0, icon: "bi-wifi" },
              { type: "temperature", value: 0, icon: "bi-thermometer-half" },
            ],
          }
        ];
      } finally {
        loading.value = false;
      }
    };
    
    // Reverse geocode coordinates to location names
    const processDeviceLocations = async () => {
      console.log('🔍 Processing locations for', devices.value.length, 'devices');
      
      for (const device of devices.value) {
        console.log(`🔍 Checking device location: "${device.location}"`);
        
        // First, check if location is a JSON string (from database)
        try {
          const parsed = JSON.parse(device.location);
          if (parsed && typeof parsed === 'object') {
            // Extract city_name from JSON object
            if (parsed.city_name) {
              device.location = parsed.city_name;
              console.log(`✅ Extracted city_name from JSON: ${device.location}`);
              continue;
            } else if (parsed.address) {
              device.location = parsed.address;
              console.log(`✅ Extracted address from JSON: ${device.location}`);
              continue;
            }
          }
        } catch (e) {
          // Not a JSON string, continue with normal processing
        }
        
        // Check if location is coordinates (latitude, longitude format)
        // Pattern matches: "19.076, 72.8777" or "19.076,72.8777"
        const coordMatch = device.location?.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lon = parseFloat(coordMatch[2]);
          const cacheKey = `${lat},${lon}`;
          
          console.log(`📍 Found coordinates for ${device.name}: lat=${lat}, lon=${lon}`);
          
          // Check cache first
          if (locationCache.value.has(cacheKey)) {
            const cached = locationCache.value.get(cacheKey);
            if (cached) {
              device.location = String(cached);
              console.log(`✅ Using cached location for ${device.name}: ${device.location}`);
            }
          } else {
            try {
              // Reverse geocode coordinates to get actual location
              console.log(`🌐 Reverse geocoding ${device.name} (${lat}, ${lon})...`);
              const geoData = await reverseGeocode(lat, lon);
              if (geoData) {
                // Ensure address is a string, handle both nested object and direct string
                let addressStr = '';
                if (typeof geoData.address === 'string') {
                  addressStr = geoData.address;
                } else if (typeof geoData.city_name === 'string') {
                  // Handle API response with city_name field
                  addressStr = geoData.city_name;
                } else if (typeof geoData.address === 'object' && geoData.address !== null) {
                  // If address is an object, try to extract a display string
                  addressStr = geoData.address.display_name || JSON.stringify(geoData.address);
                } else {
                  addressStr = String(geoData.address || geoData);
                }
                
                if (addressStr && addressStr !== '[object Object]') {
                  device.location = addressStr;
                  locationCache.value.set(cacheKey, addressStr);
                  console.log(`📍 Geocoded ${device.name} to: ${addressStr}`);
                } else {
                  console.warn(`⚠️ Geocoding returned invalid address for ${device.name}`);
                }
              } else {
                console.warn(`⚠️ Geocoding returned no data for ${device.name}`);
              }
            } catch (err) {
              console.warn(`⚠️ Could not geocode ${cacheKey}:`, err);
              // Keep original coordinates if geocoding fails
            }
          }
        } else {
          console.log(`ℹ️ Location for ${device.name} is not coordinates: "${device.location}"`);
        }
      }
      
      console.log('✅ Location processing complete:', devices.value);
    };
    
    // Load devices on mount
    onMounted(() => {
      fetchDevices();
    });

    // Computed property for filtered devices
    const filteredDevices = computed(() => {
      const query = searchQuery.value.toLowerCase().trim();
      const filter = currentFilter.value;
      
      return devices.value.filter((device) => {
        const matchesSearch = 
          device.name.toLowerCase().includes(query) ||
          device.type.toLowerCase().includes(query) ||
          device.location.toLowerCase().includes(query);
          
        const matchesFilter = 
          filter === "all" || device.status === filter;
          
        return matchesSearch && matchesFilter;
      });
    });

    // Methods
    const searchItems = () => {
      // No need to do anything here since we're using a computed property
    };

    const applyFilter = (filter: string) => {
      currentFilter.value = filter;
    };

    const handleDeviceCreated = async (newDevice: any) => {
      console.log('✅ New device created:', newDevice);
      // Refresh device list
      await fetchDevices();
      console.log('🔄 Device list refreshed');
    };
    
    const handleDeviceRemoved = async (removedDevice: { id: string; name: string }) => {
      console.log('✅ Device removed:', removedDevice);
      
      // Remove device from local state immediately for better UX
      devices.value = devices.value.filter(device => device.id !== removedDevice.id);
      
      // Optional: Show success message
      console.log(`🔄 Device "${removedDevice.name}" removed from list`);
    };

    return {
      devices,
      searchQuery,
      currentFilter,
      loading,
      error,
      filteredDevices,
      searchItems,
      applyFilter,
      handleDeviceCreated,
      handleDeviceRemoved,
      fetchDevices,
    };
  },
});
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>