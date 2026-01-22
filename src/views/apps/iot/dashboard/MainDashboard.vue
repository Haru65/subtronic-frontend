<template>
  <div class="row">
    <div class="row g-4">
      <div class="col-lg-3 col-md-6 col-sm-6">
        <StatCardWidget
          widget-classes="card-xl-stretch mb-xl-8"
          icon-name="hdd-network"
          color="light"
          icon-color="primary"
          title="2"
          description="All registered devices"
          heading="Total Devices"
        />
      </div>

      <div class="col-lg-3 col-md-6 col-sm-6">
        <StatCardWidget
          widget-classes="card-xl-stretch mb-xl-8"
          icon-name="wifi"
          color="light"
          icon-color="success"
          title="2"
          description="Currently online"
          :change-value="5"
          :is-positive="true"
          heading="Active Devices"
        />
      </div>

      <div class="col-lg-3 col-md-6 col-sm-6">
        <StatCardWidget
          widget-classes="card-xl-stretch mb-xl-8"
          icon-name="exclamation-triangle"
          color="light"
          icon-color="warning"
          title="0"
          description="Issues detected"
          :change-value="0"
          :is-positive="true"
          heading="Warnings"
        />
      </div>
    </div>

    <!-- Devices Grid -->
    <div v-if="devices.length > 0" class="row g-4">
      <div
        class="col-lg-4 col-md-6 col-sm-12"
        v-for="device in devices"
        :key="device.id"
      >
        <DeviceCardWidget v-bind="device" />
      </div>
    </div>

    <div class="row g-4">
      <div class="col-12">
        <IndiaMap />
      </div>
    </div>
  </div>
</template>
  
  <script lang="ts">
import { getAssetPath } from "@/core/helpers/assets";
import { defineComponent, onMounted, ref, watch, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { generateStorageUrl } from "@/core/helpers/storageUrl";
import StatCardWidget from "@/components/iot/component/dashboard/StatCardWidget.vue";
import DeviceCardWidget from "@/components/iot/component/dashboard/DeviceCardWidget.vue";
import IndiaMap from "@/components/iot/component/dashboard/IndiaMap.vue";
import { reverseGeocode } from "@/utils/reverseGeocode";

export default defineComponent({
  name: "main-dashboard",
  components: {
    StatCardWidget,
    DeviceCardWidget,
    IndiaMap,
  },
  setup() {
    const authStore = useAuthStore();
    const User = authStore.GetUser();

    const devices = ref<any[]>([]);
    const locationCache = ref<Map<string, string>>(new Map());

    // Fetch devices from API
    const fetchDevices = async () => {
      try {
        const apiUrl = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
        const response = await fetch(`${apiUrl}/api/devices`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 Dashboard received devices:', result);
        
        // Handle both array and object with devices property
        let deviceList = Array.isArray(result) ? result : (result.devices || []);
        
        // Transform and geocode devices
        devices.value = await Promise.all(
          deviceList.map(async (device: any) => {
            const transformed = {
              id: device.id || device.deviceId,
              sensorId: device.sensorId || device.id || device.deviceId,
              name: device.name || `Device ${device.id || device.deviceId}`,
              icon: device.icon || 'bi-device',
              type: device.type || 'IoT Sensor',
              location: device.location || 'N/A',
              status: device.status || 'offline',
              lastSeen: device.lastSeen || 'Never',
              metrics: device.metrics || []
            };
            
            // Geocode location if it's coordinates
            const coordMatch = transformed.location?.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
            if (coordMatch) {
              const lat = parseFloat(coordMatch[1]);
              const lon = parseFloat(coordMatch[2]);
              const cacheKey = `${lat},${lon}`;
              
              if (locationCache.value.has(cacheKey)) {
                transformed.location = locationCache.value.get(cacheKey) || transformed.location;
              } else {
                try {
                  const geoData = await reverseGeocode(lat, lon);
                  if (geoData && geoData.address) {
                    transformed.location = geoData.address;
                    locationCache.value.set(cacheKey, geoData.address);
                  }
                } catch (err) {
                  console.warn(`Could not geocode ${cacheKey}:`, err);
                }
              }
            }
            
            return transformed;
          })
        );
        
        console.log('✅ Dashboard devices loaded:', devices.value);
      } catch (error) {
        console.error('❌ Error fetching devices:', error);
      }
    };

    onMounted(() => {
      fetchDevices();
    });

    return {
      User,
      generateStorageUrl,
      devices,
      getAssetPath,
      fetchDevices,
    };
  },
});
</script>