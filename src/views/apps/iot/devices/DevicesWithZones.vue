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
          :placeholder="showZoneView ? 'Search zones...' : 'Search devices by name...'"
        />
      </div>

      <!-- Buttons Group -->
      <div class="d-flex gap-2 flex-wrap">
        <!-- Add Zone Button (Zone View) -->
        <button 
          v-if="showZoneView"
          class="btn btn-success"
          @click="showAddZoneModal = true"
        >
          <i class="bi bi-plus-circle me-2"></i>Add Zone
        </button>

        <!-- Add Device Button (Device View) -->
        <button 
          v-if="!showZoneView"
          class="btn btn-primary"
          data-bs-toggle="modal"
          data-bs-target="#addDeviceModal"
        >
          <i class="bi bi-plus-circle me-2"></i>Add Device
        </button>

        <!-- Toggle Cluster View Button -->
        <button 
          class="btn"
          :class="showClusterView ? 'btn-info' : 'btn-outline-info'"
          @click="showClusterView = !showClusterView"
          title="Toggle Zone Cluster Overlay View"
        >
          <i class="bi bi-diagram-2 me-2"></i>{{ showClusterView ? 'Hide' : 'Show' }} Clusters
        </button>
      </div>
    </div>

    <!-- Breadcrumb Navigation -->
    <nav v-if="!showZoneView" class="mb-4">
      <ol class="breadcrumb">
        <li class="breadcrumb-item active">
          <a href="#" @click.prevent="goBackToZones" class="text-decoration-none">
            <i class="bi bi-house me-2"></i>Zones
          </a>
        </li>
        <li class="breadcrumb-item active">{{ selectedZone?.name }}</li>
      </ol>
    </nav>

    <!-- Zone View - Overlay Style -->
    <div v-if="showZoneView" class="zones-container">
      <div class="row g-4">
        <div
          class="col-lg-3 col-md-4 col-sm-6 col-12"
          v-for="zone in filteredZones"
          :key="zone.id"
        >
          <div 
            class="zone-card card h-100 shadow-sm cursor-pointer transition-all"
            @click="selectZone(zone)"
            style="cursor: pointer; transition: all 0.3s ease;"
            @mouseover="cardHovered = zone.id"
            @mouseout="cardHovered = null"
            :style="{
              transform: cardHovered === zone.id ? 'translateY(-5px)' : 'translateY(0)',
              boxShadow: cardHovered === zone.id ? '0 10px 25px rgba(0,0,0,0.1)' : ''
            }"
          >
            <div class="card-body text-center">
              <!-- Zone Icon -->
              <div class="mb-3">
                <i class="bi bi-diagram-2 fs-1" :style="{ color: zone.color || '#007bff' }"></i>
              </div>
              
              <!-- Zone Name -->
              <h5 class="card-title fw-bold mb-2">{{ zone.name }}</h5>
              
              <!-- Device Count Badge -->
              <div class="mb-3">
                <span class="badge bg-primary">{{ zone.deviceCount }} Devices</span>
              </div>
              
              <!-- Zone Description -->
              <p class="card-text text-muted small">{{ zone.description }}</p>
              
              <!-- Click to View Arrow -->
              <div class="mt-3 text-primary">
                <i class="bi bi-chevron-right"></i> View Devices
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Zones Message -->
      <div v-if="filteredZones.length === 0" class="text-center text-muted py-10">
        <i class="bi bi-search fs-1 mb-3"></i>
        <p class="fs-5 fw-semibold mb-1">No zones found</p>
        <p class="small">Try adjusting your search criteria.</p>
      </div>
    </div>

    <!-- Device View - After Zone Selected -->
    <div v-else>
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

      <!-- Broadcast Message Button -->
      <button 
        type="button" 
        class="btn btn-info mb-5"
        @click="showBroadcast = !showBroadcast"
      >
        <i class="bi bi-broadcast me-2"></i>
        {{ showBroadcast ? 'Hide Broadcast' : 'Broadcast Message' }}
      </button>

      <!-- Broadcast Message Component -->
      <div v-if="showBroadcast" class="mb-6">
        <BroadcastMessage />
      </div>

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
        <p class="fs-5 fw-semibold mb-1">No devices found in {{ selectedZone?.name }}</p>
        <p class="small">Try adjusting your search or filter criteria.</p>
      </div>
    </div>

    <!-- Zone Cluster Overlay Component -->
    <div v-if="showClusterView" class="mb-6">
      <ZoneClusterOverlay 
        :devices="allDevices" 
        @clusterSelected="handleClusterSelected"
      />
    </div>

    <!-- Add Zone Modal -->
    <div v-if="showAddZoneModal" class="modal fade d-block" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add New Zone</h5>
            <button type="button" class="btn-close" @click="showAddZoneModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="addNewZone">
              <!-- Zone Name -->
              <div class="mb-3">
                <label for="zoneName" class="form-label">Zone Name</label>
                <input 
                  v-model="newZoneForm.name"
                  type="text" 
                  class="form-control" 
                  id="zoneName"
                  placeholder="e.g., Building A, Floor 2"
                  required
                />
              </div>

              <!-- Zone Description -->
              <div class="mb-3">
                <label for="zoneDescription" class="form-label">Description</label>
                <textarea 
                  v-model="newZoneForm.description"
                  class="form-control" 
                  id="zoneDescription"
                  rows="3"
                  placeholder="Enter zone description..."
                ></textarea>
              </div>

              <!-- Zone Color -->
              <div class="mb-3">
                <label for="zoneColor" class="form-label">Zone Color</label>
                <div class="d-flex gap-2 flex-wrap">
                  <button 
                    v-for="color in availableColors"
                    :key="color"
                    type="button"
                    class="color-picker"
                    :style="{ backgroundColor: color, border: newZoneForm.color === color ? '3px solid #000' : 'none' }"
                    @click="newZoneForm.color = color"
                  ></button>
                </div>
                <input 
                  v-model="newZoneForm.color"
                  type="text" 
                  class="form-control mt-2" 
                  id="zoneColor"
                  placeholder="#007bff"
                />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAddZoneModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="addNewZone">Add Zone</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Device Modal -->
    <AddDeviceModal @deviceCreated="handleDeviceCreated" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import DeviceCardWidget from "@/components/iot/component/dashboard/DeviceCardWidget.vue";
import BroadcastMessage from "@/components/iot/BroadcastMessage.vue";
import AddDeviceModal from "@/components/iot/AddDeviceModal.vue";
import ZoneClusterOverlay from "@/components/iot/component/ZoneClusterOverlay.vue";
import KTIcon from "@/core/helpers/kt-icon/KTIcon.vue";
import ApiService from "@/core/services/ApiService";

// Interfaces
interface Zone {
  id: string;
  name: string;
  description: string;
  color: string;
  deviceCount: number;
}

type DeviceStatus = "online" | "offline" | "warning" | "critical";

interface Metric {
  type: string;
  value: number;
  icon: string;
}

interface Device {
  id: string;
  name: string;
  icon: string;
  type: string;
  location: string;
  status: DeviceStatus;
  lastSeen: string;
  metrics: Metric[];
  zoneId?: string;
}

export default defineComponent({
  name: "DevicesWithZones",
  components: {
    DeviceCardWidget,
    BroadcastMessage,
    AddDeviceModal,
    ZoneClusterOverlay,
    KTIcon,
  },
  setup() {
    // State Management
    const showZoneView = ref(true);
    const showClusterView = ref(false);
    const showAddZoneModal = ref(false);
    const selectedZone = ref<Zone | null>(null);
    const selectedCluster = ref<any>(null);
    const cardHovered = ref<string | null>(null);
    
    // Search and filter state
    const searchQuery = ref("");
    const currentFilter = ref("all");
    const showBroadcast = ref(false);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const locationCache = ref<Map<string, string>>(new Map());

    // Zone form state
    const newZoneForm = ref({
      name: "",
      description: "",
      color: "#007bff"
    });

    // Available colors for zone selection
    const availableColors = [
      "#007bff", // Blue
      "#28a745", // Green
      "#ffc107", // Yellow
      "#dc3545", // Red
      "#20c997", // Teal
      "#e83e8c", // Pink
      "#fd7e14", // Orange
      "#6f42c1"  // Purple
    ];

    // Data
    const zones = ref<Zone[]>([]);
    const devices = ref<Device[]>([]);
    const allDevices = ref<Device[]>([]); // Store all devices, we'll filter by zone

    // Fetch zones from backend or generate mock data
    const fetchZones = async () => {
      try {
        loading.value = true;
        console.log('🔍 Fetching zones...');
        
        // For now, we'll create zones based on device locations
        // In the future, you can fetch this from an API endpoint
        const apiUrl = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
        
        // Mock zones - customize as needed
        const mockZones: Zone[] = [
          {
            id: "zone-1",
            name: "Zone 1",
            description: "Primary monitoring zone",
            color: "#007bff",
            deviceCount: 0
          },
          {
            id: "zone-2",
            name: "Zone 2",
            description: "Secondary monitoring zone",
            color: "#28a745",
            deviceCount: 0
          },
          {
            id: "zone-3",
            name: "Zone 3",
            description: "Tertiary monitoring zone",
            color: "#ffc107",
            deviceCount: 0
          },
          {
            id: "zone-4",
            name: "Zone 4",
            description: "Backup monitoring zone",
            color: "#dc3545",
            deviceCount: 0
          }
        ];

        zones.value = mockZones;
        console.log('✅ Zones loaded:', zones.value.length);
      } catch (err: any) {
        console.error('❌ Error fetching zones:', err);
        error.value = err.message || 'Failed to load zones';
      }
    };

    // Fetch devices from backend
    const fetchDevices = async () => {
      try {
        loading.value = true;
        console.log('🔍 Fetching devices from API...');
        
        const response = await ApiService.query("/api/devices", {});
        console.log('📦 Received from API:', response.data);
        
        // Transform API response
        const result = response.data;
        const transformedDevices = result.devices?.map((device: any, index: number) => {
          // Assign devices to zones in round-robin fashion
          const zoneIndex = index % zones.value.length;
          return {
            id: device.deviceId,
            name: device.name,
            icon: device.icon || 'bi-device',
            type: 'IoT Sensor',
            location: device.location,
            status: device.status,
            lastSeen: device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never',
            metrics: [],
            zoneId: zones.value[zoneIndex]?.id || "zone-1"
          };
        }) || [];
        
        allDevices.value = transformedDevices;
        
        // Update device counts in zones
        zones.value = zones.value.map(zone => ({
          ...zone,
          deviceCount: transformedDevices.filter(d => d.zoneId === zone.id).length
        }));
        
        // Process location data for all devices
        await processDeviceLocations();
        
        console.log('✅ Updated devices.value:', allDevices.value.length, 'devices');
      } catch (err: any) {
        console.error('❌ Error fetching devices:', err);
        error.value = err.message || 'Failed to load devices from backend';
      } finally {
        loading.value = false;
      }
    };

    // Reverse geocoding is now handled by backend to avoid CORS issues
    // Location data comes from server with coordinates already converted to location names
    const processDeviceLocations = async () => {
      // Backend provides location data, no frontend processing needed
      return;
    };

    // Load data on mount
    onMounted(async () => {
      await fetchZones();
      await fetchDevices();
    });

    // Computed property for filtered zones
    const filteredZones = computed(() => {
      const query = searchQuery.value.toLowerCase().trim();
      return zones.value.filter(zone => 
        zone.name.toLowerCase().includes(query) ||
        zone.description.toLowerCase().includes(query)
      );
    });

    // Computed property for devices in selected zone
    const zoneDevices = computed(() => {
      if (!selectedZone.value) return [];
      return allDevices.value.filter(device => device.zoneId === selectedZone.value?.id);
    });

    // Computed property for filtered devices in selected zone
    const filteredDevices = computed(() => {
      const query = searchQuery.value.toLowerCase().trim();
      const filter = currentFilter.value;
      
      return zoneDevices.value.filter((device) => {
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
    const selectZone = (zone: Zone) => {
      selectedZone.value = zone;
      showZoneView.value = false;
      searchQuery.value = ""; // Reset search when entering device view
    };

    const goBackToZones = () => {
      showZoneView.value = true;
      selectedZone.value = null;
      searchQuery.value = ""; // Reset search when going back to zones
    };

    const handleClusterSelected = (cluster: any) => {
      selectedCluster.value = cluster;
      console.log('✅ Cluster selected:', cluster);
    };

    const searchItems = () => {
      // Computed properties handle filtering
    };

    const applyFilter = (filter: string) => {
      currentFilter.value = filter;
    };

    const handleDeviceCreated = async (newDevice: any) => {
      console.log('✅ New device created:', newDevice);
      await fetchDevices();
      console.log('🔄 Device list refreshed');
    };
    
    const handleDeviceRemoved = async (removedDevice: { id: string; name: string }) => {
      console.log('✅ Device removed:', removedDevice);
      allDevices.value = allDevices.value.filter(device => device.id !== removedDevice.id);
      
      // Update zone device count
      if (selectedZone.value) {
        const zone = zones.value.find(z => z.id === selectedZone.value?.id);
        if (zone) {
          zone.deviceCount = zoneDevices.value.length;
        }
      }
      
      console.log(`🔄 Device "${removedDevice.name}" removed from list`);
    };

    const addNewZone = () => {
      if (!newZoneForm.value.name.trim()) {
        alert('Please enter a zone name');
        return;
      }

      const newZone: Zone = {
        id: `zone-${Date.now()}`,
        name: newZoneForm.value.name,
        description: newZoneForm.value.description,
        color: newZoneForm.value.color,
        deviceCount: 0
      };

      zones.value.push(newZone);
      console.log('✅ New zone created:', newZone);

      // Reset form
      newZoneForm.value = {
        name: "",
        description: "",
        color: "#007bff"
      };

      // Close modal
      showAddZoneModal.value = false;

      // Show success message
      alert(`Zone "${newZone.name}" created successfully!`);
    };

    return {
      showZoneView,
      showClusterView,
      showAddZoneModal,
      selectedZone,
      selectedCluster,
      zones,
      devices,
      allDevices,
      searchQuery,
      currentFilter,
      showBroadcast,
      loading,
      error,
      cardHovered,
      newZoneForm,
      availableColors,
      filteredZones,
      filteredDevices,
      selectZone,
      goBackToZones,
      searchItems,
      applyFilter,
      handleDeviceCreated,
      handleDeviceRemoved,
      handleClusterSelected,
      addNewZone,
    };
  },
});
</script>

<style scoped>
.zones-container {
  animation: fadeIn 0.3s ease-in;
}

.zone-card {
  border: 2px solid transparent;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.zone-card:hover {
  border-color: #007bff;
  background: linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%);
}

.cursor-pointer {
  cursor: pointer;
}

.transition-all {
  transition: all 0.3s ease;
}

.color-picker {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  border: 2px solid #dee2e6;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.color-picker:hover {
  transform: scale(1.1);
  border-color: #0d6efd;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
