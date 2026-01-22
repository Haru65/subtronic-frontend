<template>
  <div class="card shadow">
    <div class="card-header border-0 pt-5">
      <h3 class="card-title align-items-start flex-column">
        <span class="card-label fw-bold fs-3 mb-1 text-gray-800"
          >Device Locations</span
        >
      </h3>
    </div>
    <VChart
      :option="chartOptions"
      autoresize
      style="height: 300px; width: 100%"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import VChart from "vue-echarts";
import * as echarts from "echarts";
import { use } from "echarts/core";
import { io } from "socket.io-client";
import { reverseGeocode } from "@/utils/reverseGeocode";

// ECharts modules
import { MapChart } from "echarts/charts";
import { TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { indiaGeo } from "@/core/helpers/indiaGeo";
// GeoJSON map of India

// Register modules locally
use([MapChart, TooltipComponent, VisualMapComponent, CanvasRenderer]);

interface DeviceLocation {
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  lastSeen: number;
  isActive: boolean;
  location?: string;
}

export default defineComponent({
  name: "IndiaMap",
  components: {
    VChart,
  },
  setup() {
    const chartOptions = ref({});
    const activeDevices = ref<DeviceLocation[]>([]);
    const locationCache = ref<Map<string, string>>(new Map());
    let socket: any = null;
    let refreshInterval: any = null;

    // Geocode coordinates to location names
    const geocodeDeviceLocation = async (device: DeviceLocation) => {
      // If location is already a name (not coordinates), skip
      if (device.location && !device.location.match(/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/)) {
        console.log(`ℹ️ Location for ${device.deviceId} is already an address: "${device.location}"`);
        return device.location;
      }

      const cacheKey = `${device.latitude},${device.longitude}`;
      
      // Check cache first
      if (locationCache.value.has(cacheKey)) {
        const cached = locationCache.value.get(cacheKey);
        console.log(`✅ Using cached location for ${device.deviceId}: ${cached}`);
        return cached || `${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}`;
      }

      try {
        // Reverse geocode coordinates to get location name
        console.log(`🌐 Reverse geocoding device ${device.deviceId} (${device.latitude}, ${device.longitude})...`);
        const geoData = await reverseGeocode(device.latitude, device.longitude);
        if (geoData && geoData.address) {
          locationCache.value.set(cacheKey, geoData.address);
          console.log(`📍 Geocoded device ${device.deviceId} to: ${geoData.address}`);
          return geoData.address;
        }
      } catch (err) {
        console.warn(`⚠️ Could not geocode device ${device.deviceId}:`, err);
      }

      // Fallback to coordinates format
      return `${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}`;
    };

    // Function to update map with active device locations
    const updateMapWithActiveDevices = async () => {
      // Filter to show only ACTIVE devices on the map
      console.log(`🔍 Filtering devices: Total=${activeDevices.value.length}`);
      activeDevices.value.forEach(d => {
        console.log(`   Device ${d.deviceId}: isActive=${d.isActive} (type: ${typeof d.isActive})`);
      });
      
      const onlyActiveDevices = activeDevices.value.filter(device => device.isActive === true);
      console.log(`✅ After filter: Active=${onlyActiveDevices.length}, Will display on map`);
      
      if (onlyActiveDevices.length === 0) {
        // Show default static locations if no active devices
        chartOptions.value = {
          ...chartOptions.value,
          series: [
            {
              name: "Devices",
              type: "scatter",
              coordinateSystem: "geo",
              symbolSize: 15,
              itemStyle: {
                color: "#cccccc",
              },
              label: {
                show: true,
                formatter: "{b}",
                position: "right",
              },
              data: [
                { name: "No Active Devices", value: [77.2090, 28.6139, 0] },
              ],
            },
          ],
        };
        return;
      }

      // Convert active devices to map data format with geocoded locations
      const mapData = await Promise.all(
        onlyActiveDevices.map(async (device) => {
          const geocodedLocation = await geocodeDeviceLocation(device);
          return {
            name: device.name || `Device ${device.deviceId}`,
            value: [device.longitude, device.latitude, 1],
            deviceId: device.deviceId,
            isActive: device.isActive,
            lastSeen: device.lastSeen,
            location: geocodedLocation,
          };
        })
      );

      chartOptions.value = {
        ...chartOptions.value,
        tooltip: {
          trigger: "item",
          formatter: (params: any) => {
            const data = params.data;
            const lastSeenTime = data.lastSeen ? new Date(data.lastSeen).toLocaleString() : 'Unknown';
            return `
              <div>
                <strong>${data.name}</strong><br/>
                Device ID: ${data.deviceId}<br/>
                Status: ${data.isActive ? '<span style="color: #28a745;">Active</span>' : '<span style="color: #dc3545;">Inactive</span>'}<br/>
                Location: ${data.location || 'N/A'}<br/>
                Coordinates: ${params.value[1].toFixed(4)}, ${params.value[0].toFixed(4)}<br/>
                Last Seen: ${lastSeenTime}
              </div>
            `;
          },
        },
        series: [
          {
            name: "Active Devices",
            type: "scatter",
            coordinateSystem: "geo",
            symbolSize: 20,
            itemStyle: {
              color: "#28a745", // Green for active devices
              borderColor: "#ffffff",
              borderWidth: 2,
            },
            label: {
              show: true,
              formatter: "{b}",
              position: "right",
              color: "#333333",
              fontSize: 12,
            },
            emphasis: {
              itemStyle: {
                color: "#ffc107",
                shadowBlur: 10,
                shadowColor: "#ffc107",
              },
            },
            data: mapData,
          },
        ],
      };
    };

    // Fetch devices from API
    const fetchDevicesForMap = async () => {
      try {
        const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/api/devices`);
        const data = await response.json();
        
        console.log("📡 Fetched devices from API:", data);
        
        if (data.success && data.devices) {
          // Transform API response to map format
          activeDevices.value = data.devices.map((device: any) => {
            // Parse coordinates from location if it's in "lat, lon" format
            const coordMatch = device.location?.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
            const isActive = device.status === 'online';
            
            console.log(`📍 Device ${device.deviceId}: status="${device.status}", isActive=${isActive}`);
            
            if (coordMatch) {
              return {
                deviceId: device.deviceId,
                name: device.name,
                latitude: parseFloat(coordMatch[1]),
                longitude: parseFloat(coordMatch[2]),
                lastSeen: new Date(device.lastSeen).getTime(),
                isActive: isActive,
                location: device.location
              };
            } else {
              // Location is already geocoded, use dummy coordinates for Mumbai
              return {
                deviceId: device.deviceId,
                name: device.name,
                latitude: 19.076,
                longitude: 72.8777,
                lastSeen: new Date(device.lastSeen).getTime(),
                isActive: isActive,
                location: device.location
              };
            }
          });
          
          const activeCount = activeDevices.value.filter(d => d.isActive).length;
          console.log(`🎯 Loaded ${activeDevices.value.length} devices for map (${activeCount} active, ${activeDevices.value.length - activeCount} inactive)`);
          await updateMapWithActiveDevices();
        }
      } catch (error) {
        console.error("❌ Error fetching devices for map:", error);
      }
    };

    onMounted(() => {
      console.log('🗺️ IndiaMap mounted, registering India map');
      echarts.registerMap("india", indiaGeo as any);

      // Initialize base chart configuration
      chartOptions.value = {
        tooltip: {
          trigger: "item",
          formatter: (params: any) =>
            `${params.name}: ${params.value[2] ?? 0} devices`,
        },
        geo: {
          map: "india",
          roam: true,
          label: {
            emphasis: {
              show: false,
            },
          },
          itemStyle: {
            normal: {
              areaColor: "#e0f7fa",
              borderColor: "#111",
            },
            emphasis: {
              areaColor: "#a5d6a7",
            },
          },
        },
        series: [
          {
            name: "Devices",
            type: "scatter",
            coordinateSystem: "geo",
            symbolSize: 15,
            itemStyle: {
              color: "#cccccc",
            },
            label: {
              show: true,
              formatter: "{b}",
              position: "right",
            },
            data: [
              { name: "No Active Devices", value: [77.2090, 28.6139, 0] },
            ],
          },
        ],
      };

      // Fetch devices from API
      fetchDevicesForMap();
      
      // Refresh devices every 30 seconds
      refreshInterval = setInterval(fetchDevicesForMap, 30000);
      
      // Also setup Socket.IO connection for real-time updates
      console.log('🔌 Connecting to Socket.IO for device locations');
      socket = io(import.meta.env.VITE_APP_API_URL || "http://localhost:3001");
      
      // Listen for active devices locations updates
      socket.on("activeDevicesLocations", async (data: any) => {
        console.log("📍 Socket.IO received active devices locations:", data);
        
        // Ensure devices have isActive property
        activeDevices.value = (data.devices || []).map((device: any) => ({
          ...device,
          isActive: device.isActive ?? (device.status === 'online')
        }));
        
        console.log(`🎯 Updating map with ${activeDevices.value.length} devices from socket`);
        await updateMapWithActiveDevices();
      });

      // Listen for individual device location updates
      socket.on("deviceLocationUpdate", async (data: DeviceLocation) => {
        console.log("📍 Socket.IO received device location update:", data);
        
        // Ensure device has isActive property
        const deviceData = {
          ...data,
          isActive: data.isActive ?? (data.status === 'online')
        };
        
        // Update or add device in the active devices list
        const existingIndex = activeDevices.value.findIndex(
          (device) => device.deviceId === deviceData.deviceId
        );
        
        if (existingIndex >= 0) {
          activeDevices.value[existingIndex] = deviceData;
          console.log(`✅ Updated device ${deviceData.deviceId} in map`);
        } else {
          activeDevices.value.push(deviceData);
          console.log(`✨ Added new device ${deviceData.deviceId} to map`);
        }
        
        await updateMapWithActiveDevices();
      });

      socket.on("connect", () => {
        console.log("🟢 Connected to Socket.IO for device locations");
      });

      socket.on("disconnect", () => {
        console.log("🔴 Disconnected from Socket.IO");
      });

      socket.on("error", (error: any) => {
        console.error("❌ Socket.IO error:", error);
      });
    });

    onUnmounted(() => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (socket) {
        socket.disconnect();
      }
    });

    return {
      chartOptions,
      activeDevices,
      locationCache,
    };
  },
});
</script>
