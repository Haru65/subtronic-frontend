<template>
  <div class="card p-4 shadow">
    <!-- Header: Icon + Info + Status -->
    <div class="d-flex justify-content-between">
      <div class="d-flex align-items-start gap-3">
        <div class="mt-1 bg-primary bg-opacity-10 p-2 rounded">
          <i :class="[icon, 'text-primary']" style="font-size: 1.25rem"></i>
        </div>
        <div>
          <h3 class="h5 mb-0 text-gray-800">{{ name }}</h3>
          <!-- Sensor ID -->
          <p class="text-gray-800 small mb-1">
            <span class="fw-semibold">ID: {{ sensorId }}</span>
          </p>
          <!-- Location - Format coordinates if needed -->
          <p class="text-gray-800 small mb-0">
            <i class="bi bi-geo-alt"></i> 
            <span :title="location">{{ formatLocation(location) }}</span>
          </p>
        </div>
      </div>

      <div class="d-flex flex-column align-items-end">
        <span
          class="small fw-medium d-flex align-items-center gap-1"
          :class="statusClass"
        >
          <span
            class="rounded-circle d-inline-block"
            :class="statusDotClass"
            style="width: 8px; height: 8px"
          ></span>
          {{ statusLabel }}
        </span>
        <span class="text-gray-800 small text-nowrap">{{ lastSeen }}</span>
      </div>
    </div>

    <div class="row mt-3 g-2">
      <div class="col text-center" v-for="metric in metrics" :key="metric.type">
        <p class="small fw-medium text-gray-800 mb-0">
          {{ metric.value }}{{ metric.type === "temperature" ? "°C" : "%" }}
        </p>
        <p class="text-gray-800 small text-capitalize">{{ metric.type }}</p>
      </div>
    </div>

    <div class="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
      <button 
        @click="handleRemoveDevice" 
        class="btn btn-outline-danger btn-sm"
        :disabled="isRemoving"
      >
        <i class="bi bi-trash me-1"></i>
        {{ isRemoving ? 'Removing...' : 'Remove' }}
      </button>
      
      <router-link 
        v-if="id"
        :to="{ name: 'subtronics-device-details', params: { deviceId: String(id) }}" 
        class="btn btn-link btn-sm text-primary p-0"
      >
        View Details
      </router-link>
      <span v-else class="btn btn-link btn-sm text-muted p-0 disabled">
        View Details
      </span>
    </div>
  </div>
</template>
  
  <script lang="ts">
import { defineComponent, computed, ref } from "vue";

type DeviceStatus = "online" | "offline" | "warning" | "critical";

interface Metric {
  type: string;
  value: number;
  icon: string;
}

export default defineComponent({
  name: "DeviceCardWidget",
  emits: ['deviceRemoved'],
  props: {
    id: { type: String, required: true },
    sensorId: { type: String, required: false, default: '' },
    name: { type: String, required: true },
    type: { type: String, required: true },
    icon: { type: String, required: true },
    location: { type: String, required: true },
    status: {
      type: String as () => DeviceStatus,
      required: true,
      validator: (value: string) =>
        ["online", "offline", "warning", "critical"].includes(value),
    },
    metrics: {
      type: Array as () => Metric[],
      required: true,
    },
    lastSeen: { type: String, required: true },
  },
  setup(props, { emit }) {
    const isRemoving = ref(false);
    
    const handleRemoveDevice = async () => {
      if (isRemoving.value) return;
      
      const confirmed = confirm(`Are you sure you want to remove device "${props.name}"? This action cannot be undone.`);
      if (!confirmed) return;
      
      try {
        isRemoving.value = true;
        console.log(`🗑️ Removing device: ${props.name} (ID: ${props.id})`);
        
        const apiUrl = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
        const response = await fetch(`${apiUrl}/api/devices/${props.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to remove device: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Device removed successfully:', result);
        
        // Emit event to parent component
        emit('deviceRemoved', { id: props.id, name: props.name });
        
      } catch (error: any) {
        console.error('❌ Error removing device:', error);
        alert(`Failed to remove device: ${error.message}`);
      } finally {
        isRemoving.value = false;
      }
    };
    
    const statusLabel = computed(() => {
      const labels: Record<DeviceStatus, string> = {
        online: "Online",
        offline: "Offline",
        warning: "Warning",
        critical: "Critical",
      };
      return labels[props.status] || "Unknown";
    });

    const statusClass = computed(() => {
      const classes: Record<DeviceStatus, string> = {
        online: "text-success",
        offline: "text-muted",
        warning: "text-warning",
        critical: "text-danger",
      };
      return classes[props.status] || "text-muted";
    });

    const statusDotClass = computed(() => {
      const dots: Record<DeviceStatus, string> = {
        online: "bg-success",
        offline: "bg-secondary",
        warning: "bg-warning",
        critical: "bg-danger",
      };
      return dots[props.status] || "bg-muted";
    });

    const metricClass = (metric: Metric): string => {
      if (metric.type === "battery" && metric.value < 20) return "text-danger";
      if (metric.type === "temperature" && metric.value > 25)
        return "text-danger";
      if (metric.type === "signal" && metric.value < 30) return "text-warning";
      return "text-primary";
    };

    // Format location - check if it's coordinates or an address
    const formatLocation = (loc: any): string => {
      // Handle non-string values
      if (!loc || loc === 'N/A') return 'N/A';
      
      // Convert to string if it's an object or not a string
      let locStr = typeof loc === 'string' ? loc : String(loc);
      
      if (!locStr || locStr === 'N/A' || locStr === '[object Object]') return 'N/A';
      
      // Try to parse as JSON first (from database storage)
      try {
        const parsed = JSON.parse(locStr);
        if (parsed && typeof parsed === 'object') {
          if (parsed.city_name) return parsed.city_name;
          if (parsed.address) return parsed.address;
          if (parsed.display_name) return parsed.display_name;
        }
      } catch (e) {
        // Not valid JSON, continue with coordinate check
      }
      
      // Check if location looks like coordinates (latitude, longitude)
      const coordMatch = locStr.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        // Return shortened coordinate display
        return `${coordMatch[1]}, ${coordMatch[2]}`;
      }
      
      // Otherwise return the location as-is (assumed to be an address)
      return locStr;
    };

    return {
      statusLabel,
      statusClass,
      statusDotClass,
      metricClass,
      formatLocation,
      isRemoving,
      handleRemoveDevice,
    };
  },
});
</script>
  