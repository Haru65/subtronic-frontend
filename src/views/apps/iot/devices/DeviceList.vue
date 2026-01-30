<template>
  <div class="card">
    <div class="card-header border-0 pt-6">
      <div class="card-title">
        <div class="d-flex align-items-center position-relative my-1">
          <i class="bi bi-search position-absolute ms-3"></i>
          <input
            type="text"
            v-model="searchQuery"
            class="form-control form-control-solid w-250px ps-10"
            placeholder="Search devices..."
          />
        </div>
      </div>
      <div class="card-toolbar">
        <div class="d-flex justify-content-end gap-2">
          <button
            class="btn btn-sm"
            :class="statusFilter === 'all' ? 'btn-primary' : 'btn-light'"
            @click="statusFilter = 'all'"
          >
            All
          </button>
          <button
            class="btn btn-sm"
            :class="statusFilter === 'online' ? 'btn-success' : 'btn-light'"
            @click="statusFilter = 'online'"
          >
            Online
          </button>
          <button
            class="btn btn-sm"
            :class="statusFilter === 'offline' ? 'btn-danger' : 'btn-light'"
            @click="statusFilter = 'offline'"
          >
            Offline
          </button>
          <button
            class="btn btn-sm"
            :class="statusFilter === 'warning' ? 'btn-warning' : 'btn-light'"
            @click="statusFilter = 'warning'"
          >
            Warning
          </button>
        </div>
      </div>
    </div>
    <div class="card-body pt-0">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-10">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Loading devices...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        {{ error }}
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredDevices.length === 0" class="text-center py-10">
        <i class="bi bi-inbox display-4 text-muted"></i>
        <p class="mt-3 text-muted">No devices found</p>
      </div>

      <!-- Device Grid -->
      <div v-else class="row g-6 g-xl-9">
        <div
          v-for="device in filteredDevices"
          :key="device.id || device.deviceId"
          class="col-md-6 col-xl-4"
        >
          <div class="card border border-2 border-gray-300 border-hover device-card h-100">
            <div class="card-header border-0 pt-6 pb-0">
              <div class="d-flex align-items-center justify-content-between w-100">
                <div class="d-flex align-items-center gap-2">
                  <div class="symbol symbol-40px">
                    <span class="symbol-label bg-light-primary">
                      <i :class="device.icon || 'bi bi-cpu'" class="fs-2x text-primary"></i>
                    </span>
                  </div>
                  <div>
                    <h5 class="mb-0 text-dark">{{ device.name }} - {{ device.deviceId }}</h5>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-body pt-4 pb-0">
              <!-- Location (Geocoded) -->
              <p class="text-dark fw-semibold fs-6 mb-3">{{ device.displayLocation || device.location || 'N/A' }}</p>

              <!-- Status & Last Seen on one line -->
              <p class="text-dark fw-semibold fs-6 mb-4">
                <span class="badge" :class="getStatusClass(device.status)" style="margin-right: 8px;">{{ device.status }}</span>
                <span class="text-muted">{{ formatLastSeenDetailed(device.lastSeen) }}</span>
              </p>

              <!-- View Details Button -->
              <router-link
                v-if="device.deviceId"
                :to="{ name: 'subtronics-device-details', params: { deviceId: device.deviceId } }"
                class="btn btn-sm btn-primary w-100 mt-3"
              >
                <i class="bi bi-eye me-1"></i>
                View Details
              </router-link>
              <button v-else type="button" class="btn btn-sm btn-light w-100 mt-3" disabled title="Device ID not available">
                <i class="bi bi-eye me-1"></i>
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue';
import ApiService from '@/core/services/ApiService';

export default defineComponent({
  name: 'DeviceList',
  setup() {
    const devices = ref<any[]>([]);
    const loading = ref<boolean>(true);
    const error = ref<string | null>(null);
    const searchQuery = ref<string>('');
    const statusFilter = ref<string>('all');
    const refreshInterval = ref<NodeJS.Timeout | null>(null);
    const locationCache = ref<Map<string, string>>(new Map());

    // Fetch devices from API
    const fetchDevices = async () => {
      try {
        error.value = null;
        ApiService.setHeader();
        const response = await ApiService.query('/api/devices', {});
        
        console.log('📡 API Response:', response);
        console.log('📡 response.data:', response.data);
        
        // Handle API response - it returns either an array directly or { success, devices }
        let deviceList = [];
        if (Array.isArray(response.data)) {
          deviceList = response.data;
        } else if (response.data && response.data.devices) {
          deviceList = response.data.devices;
        } else if (response.data && response.data.success) {
          deviceList = [];
        } else {
          deviceList = response.data || [];
        }
        
        console.log('📦 Device list before mapping:', deviceList);
        
        // Ensure each device has an id field (fallback to deviceId if needed)
        devices.value = deviceList.map((device: any) => {
          const mapped = {
            ...device,
            id: device.id || device.deviceId,
            deviceId: device.deviceId || device.id
          };
          console.log('🔄 Device mapping:', { original: device, mapped });
          return mapped;
        });
        
        console.log('✅ Fetched devices:', devices.value.length);
        if (devices.value.length > 0) {
          console.log('📦 First device:', devices.value[0]);
        }
        
        // Process location data for all devices
        await processDeviceLocations();
      } catch (err: any) {
        console.error('Error fetching devices:', err);
        error.value = err.response?.data?.message || err.message || 'Failed to load devices';
      } finally {
        loading.value = false;
      }
    };

    // Reverse geocoding is now handled by backend to avoid CORS issues
    // Location data comes from server with coordinates already converted to location names
    const processDeviceLocations = async () => {
      for (const device of devices.value) {
        // Just use location as provided by backend
        device.displayLocation = device.location || 'N/A';
      }
    };

    // Filtered devices based on search and status
    const filteredDevices = computed(() => {
      let filtered = devices.value;

      // Filter by status
      if (statusFilter.value !== 'all') {
        filtered = filtered.filter(
          (device) => device.status?.toLowerCase() === statusFilter.value
        );
      }

      // Filter by search query
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(
          (device) =>
            device.name?.toLowerCase().includes(query) ||
            device.location?.toLowerCase().includes(query) ||
            device.deviceId?.toLowerCase().includes(query)
        );
      }

      return filtered;
    });

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

    // Get status dot color
    const getStatusDot = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'online':
          return 'bg-success';
        case 'offline':
          return 'bg-danger';
        case 'warning':
          return 'bg-warning';
        default:
          return 'bg-secondary';
      }
    };

    // Format last seen as relative time
    const formatLastSeen = (lastSeen: string | null) => {
      if (!lastSeen) return 'Never';

      const now = new Date().getTime();
      const lastSeenTime = new Date(lastSeen).getTime();
      const diffMs = now - lastSeenTime;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return `${diffSecs} sec ago`;
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    // Format last seen with date and time details
    const formatLastSeenDetailed = (lastSeen: string | null) => {
      if (!lastSeen) return 'Never';
      
      const date = new Date(lastSeen);
      const now = new Date();
      
      // If today, show time only
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      }
      
      // Otherwise show date and time
      return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }) + ' ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    };

    onMounted(() => {
      fetchDevices();

      // Auto-refresh every 30 seconds
      refreshInterval.value = setInterval(() => {
        fetchDevices();
      }, 30000);
    });

    onUnmounted(() => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
      }
    });

    return {
      devices,
      loading,
      error,
      searchQuery,
      statusFilter,
      filteredDevices,
      getStatusClass,
      getStatusDot,
      formatLastSeen,
      formatLastSeenDetailed,
      fetchDevices
    };
  }
});
</script>

<style scoped>
.device-card {
  transition: all 0.3s ease;
}

.device-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.border-hover:hover {
  border-color: var(--bs-primary) !important;
}
</style>
